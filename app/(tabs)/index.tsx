import { useState, useEffect, useRef } from 'react';
import { Text, View, Button, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Application from "expo-application";
import * as Location from 'expo-location';
import { supabase } from '../../src/utils/supabase';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("unknown-device");
  const [isProcessing, setIsProcessing] = useState(false);
  const [canScan, setCanScan] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const time = useRef<number>(0);

  useEffect(() => {
    time.current = Date.now();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const id = Application.getAndroidId();
        setDeviceId(id || "unknown-device");
        // Verificar último scan al cargar la app
        await checkLastScan(id || "unknown-device");
      } catch {
        setDeviceId("unknown-device");
        await checkLastScan("unknown-device");
      }
    })();
  }, []);

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
        const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 horas en milisegundos

        if (timeDiff < twoHoursInMs) {
          setCanScan(false);
          const remainingTime = twoHoursInMs - timeDiff;
          updateTimeRemaining(remainingTime);
          
          // Actualizar el tiempo restante cada minuto
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
          }, 60000); // Actualizar cada minuto

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
      // pedir permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "No se otorgó permiso de ubicación.");
        return;
      }

      // obtener ubicación actual
      const location = await Location.getCurrentPositionAsync({});
      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      // hora ajustada
      const currentTime = new Date();
      const boliviaTime = new Date(currentTime.getTime() - (4 * 60 * 60 * 1000));

      // guardar en supabase
      const { error } = await supabase
        .from("scans")
        .insert([
          {
            user_id: "demo-user",
            device_id: deviceId,
            qr_code: data,
            scanned_at: boliviaTime.toISOString(),
            latitude,
            longitude
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
                // Configurar el bloqueo por 2 horas
                const twoHoursInMs = 2 * 60 * 60 * 1000;
                updateTimeRemaining(twoHoursInMs);
                
                // Configurar timer para habilitar el escaneo en 2 horas
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
            Gracias por usar la app de INDECA
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
});