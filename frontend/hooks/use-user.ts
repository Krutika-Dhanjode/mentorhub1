import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  name: string
  fullName?: string
  email: string
  role: 'hod' | 'mentor' | 'student'
  phone?: string
  employmentId?: string
  department?: string
  designation?: string
  office?: string
  officeLocation?: string
  prn?: string
  address?: string
  bio?: string
  currentClass?: string
  yearOfStudy?: string
  gender?: string
  dateOfBirth?: string
  bloodGroup?: string
  guardianName?: string
  guardianPhone?: string
  guardianRelation?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  admissionDate?: string
  academicYear?: string
  birthPlace?: string
  birthDistrict?: string
  religion?: string
  category?: string
  casteSubCaste?: string
  domicile?: string
  seatType?: string
  sscMarks?: string
  sscOutOf?: string
  sscPassingYear?: string
  sscBoard?: string
  hscMarks?: string
  hscOutOf?: string
  hscPassingYear?: string
  hscBoard?: string
  diplomaMarks?: string
  diplomaOutOf?: string
  diplomaPassingYear?: string
  hscPhysicsMarks?: string
  hscChemistryMarks?: string
  hscMathematicsMarks?: string
  hscTotalMarks?: string
  lastInstitutionName?: string
  city?: string
  district?: string
  state?: string
  parentsIncome?: string
  freeConcession?: string
  numberOfChildren?: string
  fatherName?: string
  fatherAddress?: string
  fatherOfficeAddress?: string
  fatherDesignation?: string
  fatherOccupation?: string
  fatherEmail?: string
  fatherMobile?: string
  motherName?: string
  motherOfficeAddress?: string
  motherDesignation?: string
  motherOccupation?: string
  motherEmail?: string
  motherMobile?: string
  localGuardianName?: string
  localGuardianAddress?: string
  localGuardianOfficeAddress?: string
  localGuardianDesignation?: string
  localGuardianOccupation?: string
  localGuardianEmail?: string
  localGuardianMobile?: string
  localResidence?: string
  height?: string
  weight?: string
  maritalStatus?: string
  allergyHistory?: string
  photoUrl?: string
  photoPath?: string
  [key: string]: any
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient()

        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        // Get user profile from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (userError) {
          setError(userError.message)
          setLoading(false)
          return
        }

        const normalizedUser: UserProfile = {
          ...(userData as UserProfile),
          name: userData.name || userData.full_name || '',
          fullName: userData.full_name || userData.name || '',
          phone: userData.phone || '',
          employmentId: userData.employment_id || userData.employeeId || '',
          department: userData.department || '',
          designation: userData.designation || '',
          office: userData.office || userData.office_location || '',
          officeLocation: userData.office_location || userData.office || '',
          prn: userData.prn || '',
          address: userData.address || '',
          bio: userData.bio || '',
          currentClass: userData.current_class || '',
          yearOfStudy: userData.year_of_study || '',
          gender: userData.gender || '',
          dateOfBirth: userData.date_of_birth || '',
          bloodGroup: userData.blood_group || '',
          guardianName: userData.guardian_name || '',
          guardianPhone: userData.guardian_phone || '',
          guardianRelation: userData.guardian_relation || '',
          emergencyContactName: userData.emergency_contact_name || '',
          emergencyContactPhone: userData.emergency_contact_phone || '',
          admissionDate: userData.admission_date || '',
          academicYear: userData.academic_year || '',
          birthPlace: userData.birth_place || '',
          birthDistrict: userData.birth_district || '',
          religion: userData.religion || '',
          category: userData.category || '',
          casteSubCaste: userData.caste_sub_caste || '',
          domicile: userData.domicile || '',
          seatType: userData.seat_type || '',
          sscMarks: userData.ssc_marks || '',
          sscOutOf: userData.ssc_out_of || '',
          sscPassingYear: userData.ssc_passing_year || '',
          sscBoard: userData.ssc_board || '',
          hscMarks: userData.hsc_marks || '',
          hscOutOf: userData.hsc_out_of || '',
          hscPassingYear: userData.hsc_passing_year || '',
          hscBoard: userData.hsc_board || '',
          diplomaMarks: userData.diploma_marks || '',
          diplomaOutOf: userData.diploma_out_of || '',
          diplomaPassingYear: userData.diploma_passing_year || '',
          hscPhysicsMarks: userData.hsc_physics_marks || '',
          hscChemistryMarks: userData.hsc_chemistry_marks || '',
          hscMathematicsMarks: userData.hsc_mathematics_marks || '',
          hscTotalMarks: userData.hsc_total_marks || '',
          lastInstitutionName: userData.last_institution_name || '',
          city: userData.city || '',
          district: userData.district || '',
          state: userData.state || '',
          parentsIncome: userData.parents_income || '',
          freeConcession: userData.free_concession || '',
          numberOfChildren: userData.number_of_children || '',
          fatherName: userData.father_name || '',
          fatherAddress: userData.father_address || '',
          fatherOfficeAddress: userData.father_office_address || '',
          fatherDesignation: userData.father_designation || '',
          fatherOccupation: userData.father_occupation || '',
          fatherEmail: userData.father_email || '',
          fatherMobile: userData.father_mobile || '',
          motherName: userData.mother_name || '',
          motherOfficeAddress: userData.mother_office_address || '',
          motherDesignation: userData.mother_designation || '',
          motherOccupation: userData.mother_occupation || '',
          motherEmail: userData.mother_email || '',
          motherMobile: userData.mother_mobile || '',
          localGuardianName: userData.local_guardian_name || '',
          localGuardianAddress: userData.local_guardian_address || '',
          localGuardianOfficeAddress: userData.local_guardian_office_address || '',
          localGuardianDesignation: userData.local_guardian_designation || '',
          localGuardianOccupation: userData.local_guardian_occupation || '',
          localGuardianEmail: userData.local_guardian_email || '',
          localGuardianMobile: userData.local_guardian_mobile || '',
          localResidence: userData.local_residence || '',
          height: userData.height || '',
          weight: userData.weight || '',
          maritalStatus: userData.marital_status || '',
          allergyHistory: userData.allergy_history || '',
          photoUrl: userData.photo_url || '',
          photoPath: userData.photo_path || '',
        }

        setUser(normalizedUser)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading, error }
}
