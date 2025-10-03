import { useState, useEffect, useRef } from 'react';
import { Text, View, Button, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Application from "expo-application";
import * as Location from 'expo-location';
import { supabase } from '../../src/utils/supabase';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("unknown-device");
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const id = Application.getAndroidId();
        setDeviceId(id || "unknown-device");
      } catch {
        setDeviceId("unknown-device");
      }
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
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
        alert("No se otorgó permiso de ubicación.");
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
        alert("Error al guardar el código QR");
      } else {
        alert(`QR escaneado.\nAsistencia registrada.\nGracias por usar la app.`);
      }
    } catch (error) {
      console.log("Error:", error);
      alert("Error al procesar el código QR");
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
    return <Text>Cargando permisos...</Text>;
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
});