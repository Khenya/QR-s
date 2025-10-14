import { Image } from 'expo-image';
import { StyleSheet,TextInput, TouchableOpacity, Alert, ActivityIndicator, View } from 'react-native';
import { useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../../src/utils/supabase';
//import { Collapsible } from '@/components/ui/collapsible';
//import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';

export default function TabTwoScreen() {
  const [nombre, setNombre] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu nombre.');
      return;
    }

    setIsProcessing(true);
    try {
      // permisos(parecido a index)
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      } else {
        Alert.alert('Advertencia', 'No se otorgó permiso de ubicación. Se guardará sin coordenadas.');
      }

      
      const currentTime = new Date();
      const boliviaTime = new Date(currentTime.getTime() - 4 * 60 * 60 * 1000);

      
      const { error } = await supabase.from('comment').insert([
        {
          nombre: nombre.trim(),
          enviado_at: boliviaTime.toISOString(),
          latitude,
          longitude,
        },
      ]);

      if (error) {
        console.log('Error guardando:', error.message);
        throw error;
      }

      
      Alert.alert(
        'Registro Completo!',
        'Tu asistencia se guardó correctamente. Gracias por usar la app.',
        [{ text: 'OK', onPress: () => setNombre('') }]
      );
    } catch (error) {
      console.error('Error al guardar asistencia:', error);
      Alert.alert('Error', 'No se pudo guardar la asistencia. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo centrado */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/indecruz.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>

      {/* Texto grande */}
      <ThemedText style={styles.bigPrompt}>
        ¿Olvidaste tu celular?
      </ThemedText>

      <ThemedText style={styles.prompt}>
        Ingresa tu nombre para registrar tu llegada.
      </ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Tu nombre completo"
        placeholderTextColor={Colors.light.tabIconDefault}
        value={nombre}
        onChangeText={setNombre}
        autoCapitalize="words"
        editable={!isProcessing}
      />
      <TouchableOpacity
        style={[styles.button, isProcessing && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color={Colors.light.background} />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>
            Registrar Llegada
          </ThemedText>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  bigPrompt: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.light.primary,
    marginBottom: 10,
    fontFamily: Fonts.rounded,
  },
  prompt: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.light.text,
    paddingHorizontal: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    maxWidth: 300,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
    color: Colors.light.text,
  },
  button: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignSelf: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.light.tabIconDefault,
  },
  buttonText: {
    color: Colors.light.white,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});