// App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
  TextInput,
  Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Create BLE manager instance
const bleManager = new BleManager();

const App = () => {
  // State variables
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [status, setStatus] = useState('Bluetooth Status Unknown');
  const [message, setMessage] = useState('No messages received');
  const [pairedDevices, setPairedDevices] = useState([]);
  const [connected, setConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('');
  const [balance, setBalance] = useState({ npr: 0, usd: 0 });
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const backendUrl = 'http://127.0.0.1:8545'; // Update with your backend URL

  // Reference for storing UUID
  const appUUID = useRef(null);

  // Constants for connection states
  const STATE = {
    LISTENING: 'Listening for connections',
    CONNECTING: 'Connecting...',
    CONNECTED: 'Connected to device',
    CONNECTION_FAILED: 'Connection Failed',
    MESSAGE_RECEIVED: 'Message received',
  };

  // Set up the application
  const setupApp = useCallback(async () => {
    // Get or create device UUID
    await getDeviceUUID();

    // Check Bluetooth permissions
    await requestBluetoothPermissions();

    // Subscribe to Bluetooth state changes
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        setIsBluetoothEnabled(true);
        setStatus('Bluetooth is available');
      } else {
        setIsBluetoothEnabled(false);
        setStatus('Bluetooth is not available');
      }
    }, true);

    return () => subscription.remove();
  }, []);

  // Initialize app on mount
  useEffect(() => {
    setupApp();

    // Clean up on unmount
    return () => {
      if (connectedDevice) {
        disconnectFromDevice(connectedDevice);
      }
      bleManager.destroy();
    };
  }, [connectedDevice, setupApp]);

  // Get or create a unique device UUID
  const getDeviceUUID = async () => {
    try {
      const savedUUID = await AsyncStorage.getItem('DEVICE_UUID');
      if (savedUUID) {
        appUUID.current = savedUUID;
      } else {
        appUUID.current = uuidv4();
        await AsyncStorage.setItem('DEVICE_UUID', appUUID.current);
      }
    } catch (error) {
      console.error('Error with UUID storage:', error);
      // Fallback UUID if storage fails
      appUUID.current = '00001101-0000-1000-8000-00805F9B34FB'; // Standard SPP UUID
    }
  };

  // Request Bluetooth permissions based on platform
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) { // Android 12 or higher
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        return Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message: 'This app needs location permission to find BLE devices',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; // iOS handles permissions differently
  };

  // Turn on Bluetooth
  const turnOnBluetooth = async () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Enable Bluetooth',
        'Please enable Bluetooth in your device settings',
        [{ text: 'OK' }]
      );
    } else {
      // iOS handles this automatically
      setStatus('Please enable Bluetooth in your device settings');
    }
  };

  // Turn off Bluetooth
  const turnOffBluetooth = async () => {
    if (connected && connectedDevice) {
      await disconnectFromDevice(connectedDevice);
    }
    
    if (Platform.OS === 'android') {
      Alert.alert(
        'Disable Bluetooth',
        'Please disable Bluetooth in your device settings',
        [{ text: 'OK' }]
      );
    } else {
      // iOS handles this automatically
      setStatus('Please disable Bluetooth in your device settings');
    }
  };

  // Make device discoverable (Android only)
  const makeDiscoverable = () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Make Discoverable',
        'On Android, navigate to Settings > Bluetooth and make your device visible',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Make Discoverable',
        'iOS handles discoverability automatically',
        [{ text: 'OK' }]
      );
    }
    startScanning();
  };

  // Scan for Bluetooth devices
  const startScanning = async () => {
    if (!isBluetoothEnabled) {
      Alert.alert('Bluetooth Off', 'Please turn on Bluetooth first');
      return;
    }
    
    try {
      setStatus(STATE.LISTENING);
      
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          setStatus(STATE.CONNECTION_FAILED);
          return;
        }
        
        if (device && device.name) {
          // Add device to list if not already present
          setPairedDevices((currentDevices) => {
            if (!currentDevices.some((d) => d.id === device.id)) {
              return [...currentDevices, device];
            }
            return currentDevices;
          });
        }
      });
      
      // Stop scanning after 10 seconds
      setTimeout(() => {
        bleManager.stopDeviceScan();
      }, 10000);
    } catch (error) {
      console.error('BLE operation failed:', error);
      setStatus(STATE.CONNECTION_FAILED);
    }
  };

  // List paired/bonded devices
  const listPairedDevices = async () => {
    try {
      if (!isBluetoothEnabled) {
        Alert.alert('Bluetooth Off', 'Please turn on Bluetooth first');
        return;
      }
      
      setStatus('Scanning for devices...');
      startScanning();
    } catch (error) {
      console.error('Error listing devices:', error);
      Alert.alert('Error', 'Failed to list Bluetooth devices');
    }
  };

  // Connect to a selected device
  const connectToDevice = async (device) => {
    try {
      setStatus(STATE.CONNECTING);
      
      // Connect to device
      const connectedDevice = await bleManager.connectToDevice(device.id);
      
      // Discover services and characteristics
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      // Set up notification for incoming data
      setupNotifications(connectedDevice);
      
      setConnectedDevice(connectedDevice);
      setConnected(true);
      setStatus(STATE.CONNECTED);
      
      Alert.alert('Connected', `Connected to ${device.name || 'device'}`);
    } catch (error) {
      console.error('Connection error:', error);
      setStatus(STATE.CONNECTION_FAILED);
      Alert.alert('Connection Failed', 'Could not connect to the device');
    }
  };

  // Set up notifications for receiving data
  const setupNotifications = (device) => {
    // This would require knowing the exact service and characteristic UUIDs
    // Example with placeholders - you'll need to replace with actual UUIDs
    const serviceUUID = '0000XXXX-0000-1000-8000-00805F9B34FB';
    const characteristicUUID = '0000YYYY-0000-1000-8000-00805F9B34FB';
    
    device.monitorCharacteristicForService(
      serviceUUID,
      characteristicUUID,
      (error, characteristic) => {
        if (error) {
          console.error('Notification error:', error);
          return;
        }
        
        if (characteristic?.value) {
          const data = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          setMessage(`Message: ${data}`);
          setStatus(STATE.MESSAGE_RECEIVED);
        }
      }
    );
  };

  // Disconnect from a device
  const disconnectFromDevice = async (device) => {
    try {
      await bleManager.cancelDeviceConnection(device.id);
      setConnected(false);
      setConnectedDevice(null);
      setStatus('Disconnected from device');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Send data to connected device
  const sendData = async () => {
    if (!connected || !connectedDevice) {
      Alert.alert('Not Connected', 'Please connect to a device first');
      return;
    }
    
    try {
      // Example with placeholders - replace with actual UUIDs
      const serviceUUID = '0000XXXX-0000-1000-8000-00805F9B34FB';
      const characteristicUUID = '0000YYYY-0000-1000-8000-00805F9B34FB';
      
      const message = 'Hello from BOWallet!';
      const data = Buffer.from(message).toString('base64');
      
      await connectedDevice.writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        data
      );
      
      setStatus('Message sent');
      Alert.alert('Success', 'Message sent successfully');
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Send Failed', 'Could not send message to device');
    }
  };

  // Prepare to receive data
  const prepareToReceive = () => {
    if (!connected) {
      Alert.alert('Not Connected', 'Please connect to a device first');
      return;
    }
    
    setStatus('Ready to receive data');
  };

  // Login and get JWT token
  const login = async () => {
    try {
      const response = await fetch(`${backendUrl}/login/${address}`, { method: 'POST' });
      const data = await response.json();
      if (data.token) {
        setToken(data.token);
        Alert.alert('Login Successful', 'Token obtained');
      } else {
        Alert.alert('Login Failed', 'Unable to get token');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Fetch balance
  const fetchBalance = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/balance/${address}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.npr && data.usd) {
        setBalance(data);
      } else {
        Alert.alert('Error', 'Unable to fetch balance');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Transfer tokens
  const transferTokens = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: 'NPR', to: recipient, amount }),
      });
      const data = await response.json();
      if (data.txHash) {
        Alert.alert('Transfer Successful', `Transaction Hash: ${data.txHash}`);
      } else {
        Alert.alert('Error', 'Transfer failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Render device list item
  const renderDeviceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}
    >
      <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
      <Text style={styles.deviceId}>{item.id}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BOWallet</Text>
        <Image
          source={isBluetoothEnabled 
            ? require('./assets/ic_connected.png') 
            : require('./assets/ic_disabled.png')}
          style={styles.bluetoothIcon}
        />
      </View>
      
      <Text style={styles.statusText}>{status}</Text>
      <Text style={styles.messageText}>{message}</Text>
      
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={turnOnBluetooth}>
            <Text style={styles.buttonText}>Turn On</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={turnOffBluetooth}>
            <Text style={styles.buttonText}>Turn Off</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={makeDiscoverable}>
            <Text style={styles.buttonText}>Discoverable</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={listPairedDevices}>
            <Text style={styles.buttonText}>List Devices</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={sendData}>
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={prepareToReceive}>
            <Text style={styles.buttonText}>Receive</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.devicesTitle}>Available Devices:</Text>
      <FlatList
        data={pairedDevices}
        renderItem={renderDeviceItem}
        keyExtractor={(item) => item.id}
        style={styles.deviceList}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>No devices found</Text>
        }
      />

      <View style={{ padding: 20 }}>
        <Text>Enter Wallet Address:</Text>
        <TextInput value={address} onChangeText={setAddress} style={{ borderWidth: 1, marginBottom: 10 }} />
        <Button title="Login" onPress={login} />

        <Text style={{ marginTop: 20 }}>Balance:</Text>
        <Text>NPR: {balance.npr}</Text>
        <Text>USD: {balance.usd}</Text>
        <Button title="Fetch Balance" onPress={fetchBalance} />

        <Text style={{ marginTop: 20 }}>Recipient Address:</Text>
        <TextInput value={recipient} onChangeText={setRecipient} style={{ borderWidth: 1, marginBottom: 10 }} />
        <Text>Amount:</Text>
        <TextInput value={amount} onChangeText={setAmount} style={{ borderWidth: 1, marginBottom: 10 }} />
        <Button title="Transfer Tokens" onPress={transferTokens} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  bluetoothIcon: {
    width: 30,
    height: 30,
  },
  statusText: {
    fontSize: 16,
    color: '#34495E',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 0.48,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  devicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2C3E50',
  },
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 5,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  deviceId: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#95A5A6',
  },
});

export default App;