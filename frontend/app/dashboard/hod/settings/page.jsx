'use client';
import { toast } from "sonner";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { User, Save, Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

export default function AdminSettingsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const fileInputRef = useRef(null);
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        department: '',
        phone: '',
        photoUrl: '',
        photoPath: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    // ✅ load user data when available
    useEffect(() => {
        if (user) {
            setProfile({
                name: user.name || '',
                email: user.email || '',
                department: user.department || '',
                phone: user.phone || '',
                photoUrl: user.photoUrl || user.photo_url || '',
                photoPath: user.photoPath || user.photo_path || '',
            });
        }
    }, [user]);

    const handleSave = async () => {
        if (!user)
            return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                name: profile.name,
                phone: profile.phone,
                department: profile.department,
                photo_url: profile.photoUrl,
                photo_path: profile.photoPath,
            })
                .eq('id', user.id);
            if (error) {
                toast.error('Error saving profile: ' + error.message);
            }
            else {
                toast.success('Profile saved successfully!');
            }
        }
        catch (err) {
            toast.error('Failed to save profile');
        }
        finally {
            setIsSaving(false);
        }
    };

    const handlePhotoUpload = async (event) => {
        if (!user) return;
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploadingPhoto(true);
        const extension = file.name.split('.').pop() || 'jpg';
        const filePath = `${user.id}/hod-photo.${extension}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('student-profile-photos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                toast.error('Unable to upload photo: ' + uploadError.message);
                return;
            }

            const { data } = supabase.storage
                .from('student-profile-photos')
                .getPublicUrl(filePath);

            const photoUrlWithCacheBuster = `${data.publicUrl}?t=${new Date().getTime()}`;

            setProfile(current => ({
                ...current,
                photoPath: filePath,
                photoUrl: photoUrlWithCacheBuster
            }));
            toast.success('Photo uploaded! Click "Save Changes" to persist.');
        } catch (err) {
            toast.error('Error uploading photo');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    return (<div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your profile information</p>
      </div>

      {loading && (<Card className="border-border p-6 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </Card>)}

      {!loading && (<Card className="border-border p-6 mt-6">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-8 border-b border-border pb-8">
          <div className="relative group">
            <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden border-4 border-background shadow-md">
              {profile.photoUrl ? (
                <Image src={profile.photoUrl} alt="Profile" width={128} height={128} className="w-full h-full object-cover" unoptimized />
              ) : (
                <User className="w-16 h-16 text-primary/40" />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              title="Change Profile Photo"
              type="button"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl font-bold text-foreground">{profile.name || 'User'}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">{user?.role}</span>
              {profile.department && <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium">{profile.department}</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-3 flex items-center justify-center md:justify-start gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              {isUploadingPhoto ? 'Uploading image...' : 'Click the camera icon to update your photo'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="bg-input border-border"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="bg-input border-border"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" value={profile.department} onChange={(e) => setProfile({ ...profile, department: e.target.value })} className="bg-input border-border"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="bg-input border-border"/>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Save className="w-4 h-4"/>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>)}
    </div>);
}
