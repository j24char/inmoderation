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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; // Import icons for better UX
import * as ImagePicker from 'expo-image-picker'; 

// Define a simple local placeholder source
const DEFAULT_PLACEHOLDER = { uri: Platform.OS === 'web' ? '/icon.png' : require('../assets/icon.png') };

export default function ProfileScreen({ navigation }) {
    const [userId, setUserId] = useState(null);
    const [username, setUsername] = useState('');
    const [fullname, setFullname] = useState('');
    
    // State to store the fetched or newly uploaded avatar URL
    const [avatarUrl, setAvatarUrl] = useState(null); 
    
    const [loading, setLoading] = useState(true);
    
    // NEW STATE: Toggle between viewing and editing profile
    const [isEditing, setIsEditing] = useState(false);
    // State to hold temporary input values during editing
    const [tempFullname, setTempFullname] = useState('');
    const [tempUsername, setTempUsername] = useState('');

    // Logic: Determine the source for the Image component
    const avatarSource = useMemo(() => {
        //console.log("avatarUrl:", avatarUrl);
        // If avatarUrl exists and is not null/empty, use it.
        if (avatarUrl && avatarUrl.length > 0) {
            return { uri: avatarUrl };
        }
        return DEFAULT_PLACEHOLDER; 
    }, [avatarUrl]);

    //------------------------------------------------------------------------------------------
    // HELPER: Converts a local URI (from ImagePicker) to a Blob for Supabase Storage upload
    const uriToArrayBuffer = async (uri) => {
        const response = await fetch(uri);
        return await response.arrayBuffer();
    };

    //------------------------------------------------------------------------------------------
    // FUNCTION: uploadAvatar
    // Handles the actual upload to Supabase Storage
    const uploadAvatar = async (uri) => {
        if (!userId) {
            Alert.alert('Error', 'User ID not found for upload.');
            return null;
        }
        
        setLoading(true);
        let publicUrl = null;
        try {
            // Determine file extension and create a unique file path for storage
            // This is a robust way to get the file extension from the URI
            const fileExtensionMatch = uri.match(/\.([0-9a-z]+)(?=[?#]|$)/i);
            const fileExtension = (fileExtensionMatch ? fileExtensionMatch[1] : 'jpg').toLowerCase();

            // Storage path: 'avatars/user_id/timestamp.ext'
            const filePath = `${userId}/${Date.now()}.${fileExtension}`; 

            // 1. Convert URI to ArrayBuffer  
            const fileData = await uriToArrayBuffer(uri);
            let mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
            if (fileExtension === 'png') {
                mimeType = 'image/png';
            } else if (fileExtension === 'jpeg' || fileExtension === 'jpg') {
                mimeType = 'image/jpeg';
            }

            // 2. Upload to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('avatars') // Ensure this bucket exists in your Supabase project
                .upload(filePath, fileData, {
                    //cacheControl: '3600',
                    upsert: true,
                    contentType: mimeType
                });

            if (uploadError) throw uploadError;

            // 3. Get the public URL to store in the 'profiles' table
            //const { data: { publicUrl: url } } = supabase.storage
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            
            publicUrl = data.publicUrl;
            Alert.alert("Upload Success", "Image uploaded! Press 'Save Changes' to permanently update your profile.");

        } catch (error) {
            console.error('Avatar upload failed:', error.message);
            Alert.alert('Upload Error', `Failed to upload image: ${error.message}`);
        } finally {
            setLoading(false);
        }
        
        return publicUrl;
    };

    //------------------------------------------------------------------------------------------
    // Function: handleAvatarPress
    // Triggers the image selection and upload flow. Always available (unless loading).
    const handleAvatarPress = async () => {
        if (loading) return;
        
        // 1. Check/Request Permissions
        if (typeof ImagePicker === 'undefined') {
             // FALLBACK/MOCK for this code editor environment
             Alert.alert(
                "Avatar Update", 
                "ImagePicker not available. Proceeding with mock selection...", 
                [{ 
                    text: "Select Mock Image", 
                    onPress: async () => {
                        const mockUri = `https://placehold.co/150x150/4762ff/ffffff.png?text=Avatar-${Date.now()}`; 
                        const newPublicUrl = await uploadAvatar(mockUri);
                        if (newPublicUrl) setAvatarUrl(newPublicUrl);
                    }
                }]
            );
            return;
        }
        
            // Request permissions where necessary (native platforms). On web this will be a no-op.
            try {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync?.();
                if (permissionResult && permissionResult.granted === false) {
                    Alert.alert("Permission Error", "Permission to access camera roll is required!");
                    return;
                }
            } catch (permErr) {
                // Some platforms or versions may throw; continue to attempt picker.
                console.warn('ImagePicker permission check failed:', permErr);
            }
        
            // 2. Launch Image Picker
            // prefer new `ImagePicker.MediaType` API; fall back if not present
            const mediaTypes = ImagePicker.MediaType?.Images ?? ImagePicker.MediaTypeOptions?.Images ?? ImagePicker.MediaType;
            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: mediaTypes,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!pickerResult) return;

            // expo-image-picker on web returns { cancelled } or { canceled } depending on version.
            const cancelled = pickerResult.canceled ?? pickerResult.cancelled;
            if (!cancelled) {
                const uri = pickerResult.assets ? pickerResult.assets[0].uri : pickerResult.uri;
                if (uri) {
                    const newPublicUrl = await uploadAvatar(uri);
                    if (newPublicUrl) {
                        setAvatarUrl(newPublicUrl);
                        // If not already editing, optionally put the user into edit mode so they can save.
                        if (!isEditing) setIsEditing(true);
                    }
                }
            }
        
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
                
                // Fetch avatar URL from the database
                setAvatarUrl(profile?.avatar_url || ''); 
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
                // Save the new avatar URL (which was set in setAvatarUrl after upload)
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
        // Note: In a production app, you would typically refetch profile data here 
        // to discard any uploaded but unsaved avatar URL changes. For simplicity, we skip refetching.
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
        <SafeAreaView style={styles.container}>
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
                {avatarUrl ? (
                    <Image 
                        //source={avatarSource} 
                        source={{ uri: avatarUrl }}
                        style={styles.image} 
                        // Set avatarUrl to empty string if the image fails to load, triggering the icon fallback
                        //onError={() => setAvatarUrl('')}
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
                    
                    <View style={styles.buttonStack}>
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
        </SafeAreaView>
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
        width: 250,
        marginBottom: 30,
        alignItems: 'center',
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
        maxWidth: 550,
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
    buttonStack: {
        flexDirection: 'column',
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
        marginTop: 10,
    },
    cancelButton: {
        backgroundColor: '#ccc',
        marginTop: 10,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    separator: {
        height: 1,
        width: '100%',
        backgroundColor: '#ddd',
        marginVertical: 40,
    },
    signOutButton: {
        backgroundColor: '#ff3131ff',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        width: '100%',
        maxWidth: 300,
    },
});