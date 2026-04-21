'use client';
import { toast } from "sonner";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

import { User, Mail, Phone, MapPin, Save, Briefcase, Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
export default function MentorSettingsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const [profile, setProfile] = useState({
        fullName: '',
        email: '',
        phone: '',
        employmentId: '',
        department: '',
        designation: '',
        officeLocation: '',
        photoUrl: '',
        photoPath: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (user) {
            setProfile({
                fullName: user.fullName || user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                employmentId: user.employmentId || '',
                department: user.department || '',
                designation: user.designation || '',
                officeLocation: user.officeLocation || user.office || '',
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
            if (profile.email !== user.email) {
                const { error: authError } = await supabase.auth.updateUser({
                    email: profile.email,
                });
                if (authError) {
                    toast.error('Error updating auth email: ' + authError.message);
                    setIsSaving(false);
                    return;
                }
            }
            const { error } = await supabase
                .from('users')
                .update({
                name: profile.fullName,
                full_name: profile.fullName,
                email: profile.email,
                phone: profile.phone,
                employment_id: profile.employmentId,
                department: profile.department,
                designation: profile.designation,
                office: profile.officeLocation,
                office_location: profile.officeLocation,
                photo_url: profile.photoUrl,
                photo_path: profile.photoPath,
                updated_at: new Date().toISOString(),
            })
                .eq('id', user.id);
            if (error) {
                toast.error('Error saving profile: ' + error.message);
            }
            else {
                toast.success('Profile saved successfully! Refresh the page if you do not see updated account details immediately.');
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
        const filePath = `${user.id}/mentor-photo.${extension}`;

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

            setProfile(current => ({
                ...current,
                photoPath: filePath,
                photoUrl: data.publicUrl
            }));
            toast.success('Photo uploaded! Click "Save Changes" to persist.');
        } catch (err) {
            toast.error('Error uploading photo');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    return (<div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile information</p>
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
            <h2 className="text-2xl font-bold text-foreground">{profile.fullName || 'User'}</h2>
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

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Profile</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="bg-input border-border"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="pl-10 bg-input border-border"/>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="pl-10 bg-input border-border"/>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentId">Employment ID</Label>
              <Input id="employmentId" value={profile.employmentId} onChange={(e) => setProfile({ ...profile, employmentId: e.target.value })} className="bg-input border-border"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={profile.department} onChange={(e) => setProfile({ ...profile, department: e.target.value })} className="bg-input border-border"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <Input id="designation" value={profile.designation} onChange={(e) => setProfile({ ...profile, designation: e.target.value })} className="pl-10 bg-input border-border"/>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="officeLocation">Office Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground"/>
              <Input id="officeLocation" value={profile.officeLocation} onChange={(e) => setProfile({ ...profile, officeLocation: e.target.value })} className="pl-10 bg-input border-border"/>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Save className="w-4 h-4"/>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>)}
    </div>);
}
