import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';

type CaptureResult = {
  uri: string;
  cancelled: boolean;
};

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await ImagePicker.requestCameraPermissionsAsync();
  return requested.granted;
}

async function ensureLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return requested.granted;
}

export function usePhotoCapture() {
  const pickFromCamera = useCallback(async (): Promise<CaptureResult> => {
    const granted = await ensureCameraPermission();
    if (!granted) {
      Alert.alert('Permission required', 'Camera access is needed to capture vehicle photos.');
      return { uri: '', cancelled: true };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return { uri: '', cancelled: true };
    }

    return { uri: result.assets[0].uri, cancelled: false };
  }, []);

  const pickFromLibrary = useCallback(async (): Promise<CaptureResult> => {
    const granted = await ensureLibraryPermission();
    if (!granted) {
      Alert.alert('Permission required', 'Photo library access is needed to select vehicle photos.');
      return { uri: '', cancelled: true };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return { uri: '', cancelled: true };
    }

    return { uri: result.assets[0].uri, cancelled: false };
  }, []);

  const pickPhoto = useCallback(
    async (preferCamera = true): Promise<CaptureResult> => {
      if (Platform.OS === 'web') {
        return pickFromLibrary();
      }

      return new Promise((resolve) => {
        Alert.alert('Add photo', 'Choose how to add the vehicle photo.', [
          {
            text: 'Camera',
            onPress: async () => resolve(await pickFromCamera()),
          },
          {
            text: 'Gallery',
            onPress: async () => resolve(await pickFromLibrary()),
          },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve({ uri: '', cancelled: true }) },
        ]);
      });
    },
    [pickFromCamera, pickFromLibrary],
  );

  return { pickPhoto, pickFromCamera, pickFromLibrary };
}
