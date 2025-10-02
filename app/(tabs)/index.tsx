import { useState, useEffect } from 'react';
import { Text, View, Button, StyleSheet } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Application from "expo-application";
import { supabase } from '../../src/utils/supabase';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("unknown-device");

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
    setScanned(true);

    // Guardar en Supabase
    const { error } = await supabase
      .from('scans')
      .insert([
        { user_id: "demo-user", device_id: deviceId, qr_code: data }
      ]);

    if (error) {
      console.log("Error guardando:", error.message);
    } else {
      alert(`QR guardado: ${data}`);
    }
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
          <Button title="Escanear de nuevo" onPress={() => setScanned(false)} />
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
});