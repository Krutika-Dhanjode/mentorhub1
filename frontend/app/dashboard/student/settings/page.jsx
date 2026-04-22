'use client';
import { toast } from "sonner";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Download, Save, Camera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

const genderOptions = ['Male', 'Female', 'Other'];
const stateOptions = ['Maharashtra', 'Karnataka', 'Goa', 'Gujarat', 'Madhya Pradesh', 'Other'];
const categoryOptions = ['OPEN', 'OBC', 'SC', 'ST', 'EWS', 'NT', 'SBC', 'Other'];
const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const seatTypeOptions = ['CET Merit', 'Management', 'Trust quota', 'Other'];
const yesNoOptions = ['Yes', 'No'];
const maritalStatusOptions = ['No', 'Yes'];
const residenceOptions = ['College Hostel', 'Private Room', 'Private Hostel', 'Other'];

const defaultProfile = {
    name: '',
    email: '',
    phone: '',
    prn: '',
    department: '',
    address: '',
    bio: '',
    currentClass: '',
    yearOfStudy: '',
    gender: '',
    dateOfBirth: '',
    bloodGroup: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    admissionDate: '',
    academicYear: '',
    birthPlace: '',
    birthDistrict: '',
    religion: '',
    category: '',
    casteSubCaste: '',
    domicile: '',
    seatType: '',
    sscMarks: '',
    sscOutOf: '',
    sscPassingYear: '',
    sscBoard: '',
    hscMarks: '',
    hscOutOf: '',
    hscPassingYear: '',
    hscBoard: '',
    diplomaMarks: '',
    diplomaOutOf: '',
    diplomaPassingYear: '',
    hscPhysicsMarks: '',
    hscChemistryMarks: '',
    hscMathematicsMarks: '',
    hscTotalMarks: '',
    lastInstitutionName: '',
    city: '',
    district: '',
    state: '',
    parentsIncome: '',
    freeConcession: '',
    numberOfChildren: '',
    fatherName: '',
    fatherAddress: '',
    fatherOfficeAddress: '',
    fatherDesignation: '',
    fatherOccupation: '',
    fatherEmail: '',
    fatherMobile: '',
    motherName: '',
    motherOfficeAddress: '',
    motherDesignation: '',
    motherOccupation: '',
    motherEmail: '',
    motherMobile: '',
    localGuardianName: '',
    localGuardianAddress: '',
    localGuardianOfficeAddress: '',
    localGuardianDesignation: '',
    localGuardianOccupation: '',
    localGuardianEmail: '',
    localGuardianMobile: '',
    localResidence: '',
    height: '',
    weight: '',
    maritalStatus: '',
    allergyHistory: '',
    photoUrl: '',
    photoPath: '',
};
function Section({ title, children, }) {
    return (<div className="space-y-4">
      <h3 className="border-b border-border pb-2 text-lg font-semibold text-foreground">{title}</h3>
      {children}
    </div>);
}
export default function StudentSettingsPage() {
    const { user, loading } = useUser();
    const supabase = createClient();
    const fileInputRef = useRef(null);
    const [profile, setProfile] = useState(defaultProfile);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    useEffect(() => {
        if (user) {
            setProfile({
                ...defaultProfile,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                prn: user.prn || '',
                department: user.department || '',
                address: user.address || '',
                bio: user.bio || '',
                currentClass: user.currentClass || '',
                yearOfStudy: user.yearOfStudy || '',
                gender: user.gender || '',
                dateOfBirth: user.dateOfBirth || '',
                bloodGroup: user.bloodGroup || '',
                guardianName: user.guardianName || '',
                guardianPhone: user.guardianPhone || '',
                guardianRelation: user.guardianRelation || '',
                emergencyContactName: user.emergencyContactName || '',
                emergencyContactPhone: user.emergencyContactPhone || '',
                admissionDate: user.admissionDate || '',
                academicYear: user.academicYear || '',
                birthPlace: user.birthPlace || '',
                birthDistrict: user.birthDistrict || '',
                religion: user.religion || '',
                category: user.category || '',
                casteSubCaste: user.casteSubCaste || '',
                domicile: user.domicile || '',
                seatType: user.seatType || '',
                sscMarks: user.sscMarks || '',
                sscOutOf: user.sscOutOf || '',
                sscPassingYear: user.sscPassingYear || '',
                sscBoard: user.sscBoard || '',
                hscMarks: user.hscMarks || '',
                hscOutOf: user.hscOutOf || '',
                hscPassingYear: user.hscPassingYear || '',
                hscBoard: user.hscBoard || '',
                diplomaMarks: user.diplomaMarks || '',
                diplomaOutOf: user.diplomaOutOf || '',
                diplomaPassingYear: user.diplomaPassingYear || '',
                hscPhysicsMarks: user.hscPhysicsMarks || '',
                hscChemistryMarks: user.hscChemistryMarks || '',
                hscMathematicsMarks: user.hscMathematicsMarks || '',
                hscTotalMarks: user.hscTotalMarks || '',
                lastInstitutionName: user.lastInstitutionName || '',
                city: user.city || '',
                district: user.district || '',
                state: user.state || '',
                parentsIncome: user.parentsIncome || '',
                freeConcession: user.freeConcession || '',
                numberOfChildren: user.numberOfChildren || '',
                fatherName: user.fatherName || '',
                fatherAddress: user.fatherAddress || '',
                fatherOfficeAddress: user.fatherOfficeAddress || '',
                fatherDesignation: user.fatherDesignation || '',
                fatherOccupation: user.fatherOccupation || '',
                fatherEmail: user.fatherEmail || '',
                fatherMobile: user.fatherMobile || '',
                motherName: user.motherName || '',
                motherOfficeAddress: user.motherOfficeAddress || '',
                motherDesignation: user.motherDesignation || '',
                motherOccupation: user.motherOccupation || '',
                motherEmail: user.motherEmail || '',
                motherMobile: user.motherMobile || '',
                localGuardianName: user.localGuardianName || '',
                localGuardianAddress: user.localGuardianAddress || '',
                localGuardianOfficeAddress: user.localGuardianOfficeAddress || '',
                localGuardianDesignation: user.localGuardianDesignation || '',
                localGuardianOccupation: user.localGuardianOccupation || '',
                localGuardianEmail: user.localGuardianEmail || '',
                localGuardianMobile: user.localGuardianMobile || '',
                localResidence: user.localResidence || '',
                height: user.height || '',
                weight: user.weight || '',
                maritalStatus: user.maritalStatus || '',
                allergyHistory: user.allergyHistory || '',
                photoUrl: user.photoUrl || '',
                photoPath: user.photoPath || '',
            });
        }
    }, [user]);
    const updateField = (key, value) => {
        setProfile((current) => ({ ...current, [key]: value }));
    };
    const handleSave = async () => {
        if (!user)
            return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                department: profile.department,
                address: profile.address,
                bio: profile.bio,
                current_class: profile.currentClass,
                year_of_study: profile.yearOfStudy,
                gender: profile.gender,
                date_of_birth: profile.dateOfBirth || null,
                blood_group: profile.bloodGroup,
                guardian_name: profile.guardianName,
                guardian_phone: profile.guardianPhone,
                guardian_relation: profile.guardianRelation,
                emergency_contact_name: profile.emergencyContactName,
                emergency_contact_phone: profile.emergencyContactPhone,
                admission_date: profile.admissionDate || null,
                academic_year: profile.academicYear,
                birth_place: profile.birthPlace,
                birth_district: profile.birthDistrict,
                religion: profile.religion,
                category: profile.category,
                caste_sub_caste: profile.casteSubCaste,
                domicile: profile.domicile,
                seat_type: profile.seatType,
                ssc_marks: profile.sscMarks,
                ssc_out_of: profile.sscOutOf,
                ssc_passing_year: profile.sscPassingYear,
                ssc_board: profile.sscBoard,
                hsc_marks: profile.hscMarks,
                hsc_out_of: profile.hscOutOf,
                hsc_passing_year: profile.hscPassingYear,
                hsc_board: profile.hscBoard,
                diploma_marks: profile.diplomaMarks,
                diploma_out_of: profile.diplomaOutOf,
                diploma_passing_year: profile.diplomaPassingYear,
                hsc_physics_marks: profile.hscPhysicsMarks,
                hsc_chemistry_marks: profile.hscChemistryMarks,
                hsc_mathematics_marks: profile.hscMathematicsMarks,
                hsc_total_marks: profile.hscTotalMarks,
                last_institution_name: profile.lastInstitutionName,
                city: profile.city,
                district: profile.district,
                state: profile.state,
                parents_income: profile.parentsIncome,
                free_concession: profile.freeConcession,
                number_of_children: profile.numberOfChildren,
                father_name: profile.fatherName,
                father_address: profile.fatherAddress,
                father_office_address: profile.fatherOfficeAddress,
                father_designation: profile.fatherDesignation,
                father_occupation: profile.fatherOccupation,
                father_email: profile.fatherEmail,
                father_mobile: profile.fatherMobile,
                mother_name: profile.motherName,
                mother_office_address: profile.motherOfficeAddress,
                mother_designation: profile.motherDesignation,
                mother_occupation: profile.motherOccupation,
                mother_email: profile.motherEmail,
                mother_mobile: profile.motherMobile,
                local_guardian_name: profile.localGuardianName,
                local_guardian_address: profile.localGuardianAddress,
                local_guardian_office_address: profile.localGuardianOfficeAddress,
                local_guardian_designation: profile.localGuardianDesignation,
                local_guardian_occupation: profile.localGuardianOccupation,
                local_guardian_email: profile.localGuardianEmail,
                local_guardian_mobile: profile.localGuardianMobile,
                local_residence: profile.localResidence,
                height: profile.height,
                weight: profile.weight,
                marital_status: profile.maritalStatus,
                allergy_history: profile.allergyHistory,
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
        catch {
            toast.error('Failed to save profile');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleDownload = () => {
        if (!user) return;
        window.open(`/print/mentorship-form/${user.id}`, '_blank');
    };
    const renderInput = (key, label, props) => (<div className="space-y-2">
      <Label htmlFor={String(key)}>{label}</Label>
      <Input id={String(key)} type={props?.type || 'text'} value={profile[key]} disabled={props?.disabled} onChange={(e) => updateField(key, e.target.value)} className={props?.disabled ? 'bg-secondary border-border text-muted-foreground' : 'bg-input border-border'}/>
    </div>);
    const renderSelect = (key, label, options, placeholder = 'Select option') => (<div className="space-y-2">
      <Label htmlFor={String(key)}>{label}</Label>
      <select id={String(key)} value={profile[key]} onChange={(e) => updateField(key, e.target.value)} className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <option value="">{placeholder}</option>
        {options.map((option) => (<option key={option} value={option}>
            {option}
          </option>))}
      </select>
    </div>);
    const handlePhotoUpload = async (event) => {
        if (!user)
            return;
        const file = event.target.files?.[0];
        if (!file)
            return;
        setIsUploadingPhoto(true);
        const extension = file.name.split('.').pop() || 'jpg';
        const filePath = `${user.id}/student-photo.${extension}`;
        const { error: uploadError } = await supabase.storage
            .from('student-profile-photos')
            .upload(filePath, file, { upsert: true });
        if (uploadError) {
            setIsUploadingPhoto(false);
            toast.error('Unable to upload photo: ' + uploadError.message);
            return;
        }
        const { data } = supabase.storage
            .from('student-profile-photos')
            .getPublicUrl(filePath);
        
        // Auto-save to database immediately
        await supabase
            .from('users')
            .update({
                photo_path: filePath,
                photo_url: data.publicUrl,
            })
            .eq('id', user.id);

        setProfile((current) => ({
            ...current,
            photoPath: filePath,
            photoUrl: data.publicUrl,
        }));
        
        toast.success('Photo updated successfully!');
        setIsUploadingPhoto(false);
    };
    return (<div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fill the student mentorship form details here.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleDownload} disabled={loading}>
          <Download className="w-4 h-4"/>
          Download Form
        </Button>
      </div>

      {loading ? (<Card className="border-border p-6 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </Card>) : (<Card className="border-border p-6 space-y-8">
          <Section title="Photo">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative group">
                <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden border-4 border-background shadow-md">
                  {profile.photoUrl ? (
                    <Image src={profile.photoUrl} alt="Student photo" width={128} height={128} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <User className="w-16 h-16 text-primary/40" />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                  type="button"
                  title="Change Photo"
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

              <div className="space-y-1">
                <h4 className="font-medium text-foreground">Profile Picture</h4>
                <p className="text-sm text-muted-foreground">
                  {isUploadingPhoto ? 'Uploading photo...' : 'Upload a passport-size photo for your mentorship form.'}
                </p>
                <p className="text-xs text-muted-foreground pt-1 italic">
                  Recommended: Square image, max 2MB
                </p>
              </div>
            </div>
          </Section>

          <Section title="Student Information">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {renderInput('name', 'Name in full')}
              {renderInput('admissionDate', 'Admission date', { type: 'date' })}
              {renderInput('academicYear', 'Year')}
              {renderInput('prn', 'PRN No.', { disabled: true })}
              {renderSelect('gender', 'Gender', genderOptions)}
              {renderInput('dateOfBirth', 'Birth date', { type: 'date' })}
              {renderInput('birthPlace', 'Birth place')}
              {renderInput('birthDistrict', 'Birth Dist.')}
              {renderInput('religion', 'Religion')}
              {renderSelect('category', 'Category', categoryOptions)}
              {renderInput('casteSubCaste', 'Caste/Sub Caste')}
              {renderInput('domicile', 'Domicile')}
              {renderSelect('bloodGroup', 'Blood Group', bloodGroupOptions)}
              {renderSelect('seatType', 'Seat type', seatTypeOptions)}
              {renderInput('department', 'Department')}
              {renderInput('currentClass', 'Class')}
              {renderInput('yearOfStudy', 'Year Of Study')}
              {renderInput('phone', 'Phone Number')}
              {renderInput('email', 'E Mail', { type: 'email' })}
            </div>
          </Section>

          <Section title="Academic Information">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              {renderInput('sscMarks', 'SSC Marks')}
              {renderInput('sscOutOf', 'SSC out of')}
              {renderInput('sscPassingYear', 'SSC Passing Year')}
              {renderInput('sscBoard', 'SSC Board')}
              {renderInput('hscMarks', 'HSC Marks')}
              {renderInput('hscOutOf', 'HSC out of')}
              {renderInput('hscPassingYear', 'HSC Passing Year')}
              {renderInput('hscBoard', 'HSC Board')}
              {renderInput('diplomaMarks', 'Diploma Marks')}
              {renderInput('diplomaOutOf', 'Diploma out of')}
              {renderInput('diplomaPassingYear', 'Diploma Passing Year')}
              {renderInput('hscTotalMarks', 'Total')}
              {renderInput('hscPhysicsMarks', 'Physics')}
              {renderInput('hscChemistryMarks', 'Chemistry')}
              {renderInput('hscMathematicsMarks', 'Mathematics')}
            </div>
            {renderInput('lastInstitutionName', 'Name of Institution last attended (HSC/Diploma)')}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {renderInput('city', 'City')}
              {renderInput('district', 'District')}
              {renderSelect('state', 'State', stateOptions)}
            </div>
          </Section>

          <Section title="Family Information">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {renderInput('parentsIncome', 'Parents Income')}
              {renderSelect('freeConcession', 'Free concession Yes/No', yesNoOptions)}
              {renderInput('numberOfChildren', 'No of Children')}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {renderInput('fatherName', 'Father Name (in full)')}
              {renderInput('fatherAddress', "Father's permanent Residence address")}
              {renderInput('fatherOfficeAddress', 'Father Office address')}
              {renderInput('fatherDesignation', 'Father Designation')}
              {renderInput('fatherOccupation', 'Father Occupation')}
              {renderInput('fatherEmail', 'Father E Mail', { type: 'email' })}
              {renderInput('fatherMobile', 'Father Mobile No.')}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {renderInput('motherName', 'Mother Name (in full)')}
              {renderInput('motherOfficeAddress', 'Mother Office address')}
              {renderInput('motherDesignation', 'Mother Designation')}
              {renderInput('motherOccupation', 'Mother Occupation')}
              {renderInput('motherEmail', 'Mother E Mail', { type: 'email' })}
              {renderInput('motherMobile', 'Mother Mobile No.')}
            </div>
          </Section>

          <Section title="Local Guardian & Residence">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {renderInput('localGuardianName', 'Local Guardian name (in full)')}
              {renderInput('localGuardianAddress', 'Local Guardian permanent address')}
              {renderInput('localGuardianOfficeAddress', 'Local Guardian Office address')}
              {renderInput('localGuardianDesignation', 'Local Guardian Designation')}
              {renderInput('localGuardianOccupation', 'Local Guardian Occupation')}
              {renderInput('localGuardianEmail', 'Local Guardian E Mail', { type: 'email' })}
              {renderInput('localGuardianMobile', 'Local Guardian Mobile No.')}
              {renderSelect('localResidence', "Student's local residence", residenceOptions)}
              {renderInput('height', 'Height')}
              {renderInput('weight', 'Weight')}
              {renderSelect('maritalStatus', 'Married', maritalStatusOptions)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Current Address</Label>
              <Textarea id="address" value={profile.address} onChange={(e) => updateField('address', e.target.value)} className="min-h-20 bg-input border-border"/>
            </div>
          </Section>

          <Section title="Other Information">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {renderInput('guardianName', 'Guardian Name')}
              {renderInput('guardianPhone', 'Guardian Phone')}
              {renderInput('guardianRelation', 'Guardian Relation')}
              {renderInput('emergencyContactName', 'Emergency Contact Name')}
              {renderInput('emergencyContactPhone', 'Emergency Contact Phone')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={profile.bio} onChange={(e) => updateField('bio', e.target.value)} className="min-h-20 bg-input border-border"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergyHistory">Optional Info - Any allergic and disease history for precautions</Label>
              <Textarea id="allergyHistory" value={profile.allergyHistory} onChange={(e) => updateField('allergyHistory', e.target.value)} className="min-h-20 bg-input border-border"/>
            </div>
          </Section>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4"/>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>)}
    </div>);
}
