import { useState, useEffect, useRef } from 'react';
import { Text, View, Button, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Application from "expo-application";
import * as Location from 'expo-location';
import { supabase } from '../../src/utils/supabase';

const ALLOWED_AREA = {
   center: {
    latitude: -17.462420, 
    longitude: -63.18589,
  },
  radius: 95, 
};

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("unknown-device");
  const [isProcessing, setIsProcessing] = useState(false);
  const [canScan, setCanScan] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isInAllowedArea, setIsInAllowedArea] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const id = Application.getAndroidId();
        setDeviceId(id || "unknown-device");
        await checkLastScan(id || "unknown-device");
        await checkLocation();
      } catch {
        setDeviceId("unknown-device");
        await checkLastScan("unknown-device");
        await checkLocation();
      }
    })();
  }, []);

  // Función para calcular la distancia entre dos puntos en metros
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
  };

  // Verificar si está en el área permitida
  const checkLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsInAllowedArea(false);
        Alert.alert(
          'Permiso de ubicación requerido',
          'Necesitamos acceso a tu ubicación para verificar que estés en el área de trabajo.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });

      const distance = calculateDistance(
        latitude,
        longitude,
        ALLOWED_AREA.center.latitude,
        ALLOWED_AREA.center.longitude
      );

      const inArea = distance <= ALLOWED_AREA.radius;
      setIsInAllowedArea(inArea);

      if (!inArea) {
        Alert.alert(
          'Fuera del área de trabajo',
          `Debes estar dentro del área de trabajo para escanear códigos QR.\nDistancia actual: ${Math.round(distance)}m\nDistancia máxima: ${ALLOWED_AREA.radius}m`
        );
      }
    } catch (error) {
      console.log('Error obteniendo ubicación:', error);
      setIsInAllowedArea(false);
      Alert.alert(
        'Error de ubicación',
        'No se pudo obtener tu ubicación. Verifica que el GPS esté activado.'
      );
    }
  };

  const checkLastScan = async (deviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('scanned_at')
        .eq('device_id', deviceId)
        .order('scanned_at', { ascending: false })
        .limit(1);

      if (error) {
        console.log('Error consultando último scan:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const lastScanTime = new Date(data[0].scanned_at);
        const now = new Date();
        const timeDiff = now.getTime() - lastScanTime.getTime();
        const twoHoursInMs = 1 * 60 * 60 * 1000;

        if (timeDiff < twoHoursInMs) {
          setCanScan(false);
          const remainingTime = twoHoursInMs - timeDiff;
          updateTimeRemaining(remainingTime);
          
          const interval = setInterval(() => {
            const newNow = new Date();
            const newTimeDiff = newNow.getTime() - lastScanTime.getTime();
            const newRemainingTime = twoHoursInMs - newTimeDiff;
            
            if (newRemainingTime <= 0) {
              setCanScan(true);
              setTimeRemaining('');
              clearInterval(interval);
            } else {
              updateTimeRemaining(newRemainingTime);
            }
          }, 60000);

          return () => clearInterval(interval);
        } else {
          setCanScan(true);
          setTimeRemaining('');
        }
      } else {
        setCanScan(true);
        setTimeRemaining('');
      }
    } catch (error) {
      console.log('Error verificando último scan:', error);
      setCanScan(true);
    }
  };

  const updateTimeRemaining = (remainingMs: number) => {
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    setTimeRemaining(`${hours}h ${minutes}m`);
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // Verificar si está en el área permitida
    if (isInAllowedArea === false) {
      Alert.alert(
        'Fuera del área de trabajo',
        'Debes estar dentro del área de trabajo para escanear códigos QR.'
      );
      return;
    }

    if (!canScan) {
      Alert.alert(
        'Escaneo no permitido',
        `Ya registraste tu asistencia. Podrás escanear nuevamente en: ${timeRemaining}`
      );
      return;
    }

    const now = Date.now();

    if (
      isProcessing ||
      scanned ||
      lastScannedRef.current === data ||
      (now - lastScanTimeRef.current) < 3000
    ) {
      return;
    }

    lastScannedRef.current = data;
    lastScanTimeRef.current = now;

    setIsProcessing(true);
    setScanned(true);

    try {
      // Verificar ubicación nuevamente antes de guardar
      await checkLocation();
      
      if (isInAllowedArea === false) {
        Alert.alert(
          'Fuera del área de trabajo',
          'Te has movido fuera del área permitida.'
        );
        setIsProcessing(false);
        setScanned(false);
        return;
      }

      const currentTime = new Date();
      const boliviaTime = new Date(currentTime.getTime() - (4 * 60 * 60 * 1000));

      const { error } = await supabase
        .from("scans")
        .insert([
          {
            name: "demo-user",
            device_id: deviceId,
            qr_code: data,
            scanned_at: boliviaTime.toISOString(),
            latitude: currentLocation?.latitude,
            longitude: currentLocation?.longitude
          }
        ]);

      if (error) {
        console.log("Error guardando:", error.message);
        Alert.alert("Error", "Error al guardar el código QR");
      } else {
        Alert.alert(
          "Asistencia Registrada",
          "QR escaneado.\nAsistencia registrada.\nGracias por usar la app.",
          [
            {
              text: "OK",
              onPress: () => {
                setCanScan(false);
                const twoHoursInMs = 2 * 60 * 60 * 1000;
                updateTimeRemaining(twoHoursInMs);
                
                setTimeout(() => {
                  setCanScan(true);
                  setTimeRemaining('');
                }, twoHoursInMs);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.log("Error:", error);
      Alert.alert("Error", "Error al procesar el código QR");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setIsProcessing(false);
    lastScannedRef.current = '';
    lastScanTimeRef.current = 0;
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Cargando permisos...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Necesitamos acceso a la cámara para escanear códigos QR
        </Text>
        <Button onPress={requestPermission} title="Otorgar permisos" />
      </View>
    );
  }

  // Pantalla cuando está fuera del área permitida
  if (isInAllowedArea === false) {
    return (
      <View style={styles.container}>
        <View style={styles.blockedContainer}>
          <Text style={styles.blockedTitle}>Fuera del área de trabajo</Text>
          <Text style={styles.blockedMessage}>
            Debes estar dentro del área de trabajo para escanear códigos QR
          </Text>
          {currentLocation && (
            <Text style={styles.locationInfo}>
              Ubicación actual: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </Text>
          )}
          <View style={styles.buttonWrapper}>
            <Button 
              title="Verificar ubicación" 
              onPress={checkLocation}
              color="white"
            />
          </View>
        </View>
      </View>
    );
  }

  if (!canScan) {
    return (
      <View style={styles.container}>
        <View style={styles.blockedContainer}>
          <Text style={styles.blockedTitle}>Ya registraste tu asistencia</Text>
          <Text style={styles.blockedMessage}>
            Podrás escanear nuevamente en:
          </Text>
          <Text style={styles.timeRemaining}>{timeRemaining}</Text>
          <Text style={styles.thankYou}>
            Gracias por usar la app de INDECRUZ
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "pdf417"],
        }}
      />
      {isInAllowedArea && (
        <View style={styles.locationIndicator}>
          <Text style={styles.locationText}>✓ En área de trabajo</Text>
        </View>
      )}
      {scanned && (
        <View style={styles.buttonContainer}>
          <Text style={styles.scanMessage}>
            {isProcessing ? "Guardando..." : "QR escaneado correctamente"}
          </Text>
          <Button 
            title="Escanear de nuevo" 
            onPress={resetScanner}
            disabled={isProcessing}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  scanMessage: {
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#165290',
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  blockedMessage: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  timeRemaining: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ea7c37',
    textAlign: 'center',
    marginBottom: 30,
  },
  thankYou: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  locationIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 128, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
  },
  locationText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  locationInfo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonWrapper: {
    backgroundColor: '#ea7c37',
    borderRadius: 8,
    overflow: 'hidden',
  },
});