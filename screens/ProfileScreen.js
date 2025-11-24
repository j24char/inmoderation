import React, { useEffect, useState, useMemo } from 'react';
import { 
    Alert, 
    Image, 
    Platform, 
    Pressable, 
    StyleSheet, 
    Text, 
    TextInput, 
    View, 
    TouchableOpacity, 
    KeyboardAvoidingView, 
    ScrollView, 
    ActivityIndicator
} from 'react-native';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons'; // Import icons for better UX

// Define a simple local placeholder source
const DEFAULT_PLACEHOLDER = { uri: Platform.OS === 'web' ? '/icon.png' : require('../assets/icon.png') };

export default function ProfileScreen({ navigation }) {
    const [userId, setUserId] = useState(null);
    const [username, setUsername] = useState('');
    const [fullname, setFullname] = useState('');
    
    // State to store the fetched or newly uploaded avatar URL
    const [avatarUrl, setAvatarUrl] = useState(''); 
    
    const [loading, setLoading] = useState(true);
    
    // NEW STATE: Toggle between viewing and editing profile
    const [isEditing, setIsEditing] = useState(false);
    // State to hold temporary input values during editing
    const [tempFullname, setTempFullname] = useState('');
    const [tempUsername, setTempUsername] = useState('');

    // Logic: Determine the source for the Image component
    const avatarSource = useMemo(() => {
        // If avatarUrl exists and is not null/empty, use it.
        if (avatarUrl && avatarUrl.length > 0) {
            return { uri: avatarUrl };
        }
        return DEFAULT_PLACEHOLDER; 
    }, [avatarUrl]);

    //------------------------------------------------------------------------------------------
    // Function: handleAvatarPress
    // Description: Triggers the image selection and upload flow.
    const handleAvatarPress = async () => {
        if (!isEditing || loading) return;

        // --- MOCK IMAGE PICKER & UPLOAD START ---
        // In a real Expo/React Native app, you would use the following steps:
        // 1. Use Expo's ImagePicker to select an image.
        // 2. Convert the image file to a blob (File/Buffer).
        // 3. Use `supabase.storage.from('avatars').upload(...)` to upload the blob.
        // 4. Use `supabase.storage.from('avatars').getPublicUrl(...)` to get the public URL.
        // 5. Call `setAvatarUrl(newPublicUrl)`.
        
        Alert.alert(
            "Avatar Update", 
            "In a real application, you would now select and upload an image. Do you want to load a mock avatar?", 
            [
                { 
                    text: "Load Mock Image", 
                    onPress: () => {
                        setLoading(true);
                        // Mock generating a new unique, time-stamped placeholder URL
                        const newMockUrl = `https://placehold.co/150x150/4762ff/ffffff?text=Avatar-${Date.now()}`; 
                        setAvatarUrl(newMockUrl);
                        setLoading(false);
                        Alert.alert("Mock Success", "New mock avatar loaded. Press 'Save Changes' to update your profile URL.");
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    //------------------------------------------------------------------------------------------
    // Function: fetchProfileData
    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;

            const user = userData?.user;
            
            if (user?.id) {
                setUserId(user.id);
                
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("display_name, full_name, avatar_url") 
                    .eq("id", user.id)
                    .maybeSingle();

                if (profileError) throw profileError;
                
                setAvatarUrl(profile?.avatar_url || ''); // Set avatarUrl
                setFullname(profile?.full_name || '');
                setUsername(profile?.display_name || '');
                
                setTempFullname(profile?.full_name || '');
                setTempUsername(profile?.display_name || '');
            } else {
                navigation.replace('SignUp'); 
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            Alert.alert('Error', `Failed to load profile: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    //------------------------------------------------------------------------------------------
    // Function: updateProfile
    const updateProfile = async () => {
        if (!userId) return;

        setLoading(true);
        
        try {
            const updates = {
                id: userId,
                full_name: tempFullname.trim(),
                display_name: tempUsername.trim(),
                updated_at: new Date().toISOString(),
                // ADDED: Include the current avatarUrl state for saving
                avatar_url: avatarUrl, 
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates, { onConflict: 'id' });

            if (error) throw error;

            setFullname(tempFullname.trim());
            setUsername(tempUsername.trim());
            setIsEditing(false);
            Alert.alert('Success', 'Profile updated successfully!');
            
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', `Failed to update profile: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Handle cancel button in edit mode
    const handleCancel = () => {
        // Revert temporary state back to current state
        setTempFullname(fullname);
        setTempUsername(username);
        setIsEditing(false);
        // Note: We don't revert avatarUrl here, as it may have been changed by handleAvatarPress
        // but not saved. A real app might handle this with an 'unsaved changes' flow.
    };

    //------------------------------------------------------------------------------------------
    useEffect(() => {
        fetchProfileData();
    }, []);

    if (loading && !userId) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#9c31ff" />
            </View>
        );
    }
    
    //------------------------------------------------------------------------------------------
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Your Profile</Text>

            {/* Avatar Image/Icon: 
                - If not editing: Pressing enters edit mode (setIsEditing(true)).
                - If editing: Pressing triggers the avatar selection/upload flow (handleAvatarPress).
            */}
            <Pressable 
                onPress={() => isEditing ? handleAvatarPress() : setIsEditing(true)} 
                disabled={loading}
                style={({pressed}) => [styles.imagePressable, { opacity: pressed && !loading ? 0.8 : 1 }]}
            >
                {/* CONDITIONAL RENDERING: Display Image if avatarUrl exists, otherwise display Ionicons */}
                {avatarUrl ? (
                    <Image 
                        source={avatarSource} 
                        style={styles.image} 
                        // Set avatarUrl to empty string if the image fails to load, triggering the icon fallback
                        onError={() => setAvatarUrl('')}
                    />
                ) : (
                    // Fallback to Ionicons
                    <View style={[styles.image, styles.iconContainer]}>
                        <Ionicons name="person-circle-outline" size={100} color="#9c31ff" />
                    </View>
                )}
                
                {isEditing && (
                    <View style={styles.editIconContainer}>
                        {/* Camera icon provides visual cue that the avatar is clickable/editable */}
                        <Ionicons name="camera" size={24} color="#fff" />
                    </View>
                )}
            </Pressable>

            {isEditing ? (
                // EDIT MODE
                <KeyboardAvoidingView behavior="padding" style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        value={tempFullname}
                        onChangeText={setTempFullname}
                        autoFocus={true}
                    />
                    <Text style={styles.label}>Username:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        value={tempUsername}
                        onChangeText={setTempUsername}
                    />
                    
                    <View style={styles.buttonRow}>
                        <Pressable style={[styles.button, styles.saveButton]} onPress={updateProfile} disabled={loading}>
                            <Text style={styles.buttonText}>Save Changes</Text>
                        </Pressable>
                        <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel} disabled={loading}>
                            <Text style={styles.buttonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            ) : (
                // VIEW MODE
                <View style={styles.viewGroup}>
                    {/* Full Name: Tappable to initiate editing */}
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.viewField}>
                        <Text style={styles.label}>Full Name:</Text>
                        <Text style={styles.profileText}>{fullname || '— Not Set —'}</Text>
                    </TouchableOpacity>

                    <View style={styles.viewField}>
                        <Text style={styles.label}>Username:</Text>
                        <Text style={styles.profileText}>@{username}</Text>
                    </View>
                </View>
            )}
            
            <View style={styles.separator} />

            <Pressable style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
                <Text style={styles.buttonText}>Sign Out</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 30,
        color: '#9c31ff',
    },
    imagePressable: {
        marginBottom: 30,
        position: 'relative',
    },
    image: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderColor: '#9c31ff',
        borderWidth: 3,
    },
    // Style for the Ionicons container
    iconContainer: {
        backgroundColor: '#e0e0e0', // Light background for the placeholder
        justifyContent: 'center',
        alignItems: 'center',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 8,
    },
    viewGroup: {
        width: '100%',
        maxWidth: 350,
        marginTop: 20,
    },
    viewField: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#9c31ff',
    },
    profileText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
        fontWeight: '500',
    },
    // Edit Mode Styles
    inputGroup: {
        width: '100%',
        maxWidth: 350,
        marginTop: 20,
    },
    input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 20,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        marginHorizontal: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    saveButton: {
        backgroundColor: '#9c31ff',
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    separator: {
        height: 1,
        width: '80%',
        backgroundColor: '#ddd',
        marginVertical: 40,
    },
    signOutButton: {
        backgroundColor: '#ff3131ff',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        width: '80%',
        maxWidth: 300,
    },
});