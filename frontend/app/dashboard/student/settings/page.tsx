'use client'

import { useState, useEffect, type ChangeEvent } from 'react'
import Image from 'next/image'
import { Download, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'

const COLLEGE_NAME = 'Walchand College of Engineering, Sangli'
const COLLEGE_SUBTITLE = '(Government Aided Autonomous Institute)'
const DEPARTMENT_NAME = 'Department of Information Technology'
const FORM_TITLE = 'STUDENTS MENTORSHIP FORM'
const PAGE_WIDTH = 595
const RIGHT_MARGIN = 535

const genderOptions = ['Male', 'Female', 'Other']
const stateOptions = ['Maharashtra', 'Karnataka', 'Goa', 'Gujarat', 'Madhya Pradesh', 'Other']
const categoryOptions = ['OPEN', 'OBC', 'SC', 'ST', 'EWS', 'NT', 'SBC', 'Other']
const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const seatTypeOptions = ['CET Merit', 'Management', 'Trust quota', 'Other']
const yesNoOptions = ['Yes', 'No']
const maritalStatusOptions = ['No', 'Yes']
const residenceOptions = ['College Hostel', 'Private Room', 'Private Hostel', 'Other']

const escapePdfText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

type PdfTextItem = {
  text: string
  x: number
  y: number
  size?: number
}

type PdfImageItem = {
  data: Uint8Array
  width: number
  height: number
  x: number
  y: number
  displayWidth: number
  displayHeight: number
}

const getCenteredX = (text: string, size: number) => {
  const estimatedWidth = text.length * size * 0.45
  return Math.max(40, (PAGE_WIDTH - estimatedWidth) / 2)
}

const getRightAlignedX = (text: string, size: number, rightEdge = RIGHT_MARGIN) => {
  const estimatedWidth = text.length * size * 0.45
  return Math.max(40, rightEdge - estimatedWidth)
}

const encoder = new TextEncoder()

const encodeText = (value: string) => encoder.encode(value)

const buildPdfBlob = (items: PdfTextItem[], image?: PdfImageItem) => {
  const textLines = items.map(({ text, x, y, size = 10 }) => {
    return `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`
  })

  const imageLines = image
    ? [
        `${image.x} ${image.y} ${image.displayWidth} ${image.displayHeight} re S`,
        `q`,
        `${image.displayWidth} 0 0 ${image.displayHeight} ${image.x} ${image.y} cm`,
        `/Im1 Do`,
        `Q`,
      ]
    : ['430 608 100 120 re S']

  const streamLines = [...textLines, ...imageLines]

  const parts: Uint8Array[] = []
  let currentLength = 0
  const offsets: number[] = [0]
  let objectIndex = 1

  const pushPart = (part: Uint8Array) => {
    parts.push(part)
    currentLength += part.length
  }

  pushPart(encodeText('%PDF-1.4\n'))

  const addObject = (content: string | Uint8Array, binaryParts?: Uint8Array[]) => {
    offsets.push(currentLength)
    pushPart(encodeText(`${objectIndex} 0 obj\n`))
    if (typeof content === 'string') {
      pushPart(encodeText(content))
    } else {
      pushPart(content)
    }
    if (binaryParts) {
      binaryParts.forEach((part) => pushPart(part))
    }
    pushPart(encodeText('\nendobj\n'))
    objectIndex += 1
    return objectIndex - 1
  }

  const fontObject = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const imageObject = image
    ? addObject(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`,
        [image.data, encodeText('\nendstream')],
      )
    : null
  const streamContent = streamLines.join('\n')
  const contentObject = addObject(
    `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`,
  )
  const pageObjectId = addObject(
    `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> ${
      imageObject ? `/XObject << /Im1 ${imageObject} 0 R >>` : ''
    } >> /Contents ${contentObject} 0 R >>`,
  )
  const pagesObjectId = addObject(`<< /Type /Pages /Kids [${pageObjectId} 0 R] /Count 1 >>`)
  const catalogObjectId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`)

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    const partText = new TextDecoder().decode(part)
    if (partText.includes('/Parent 0 0 R')) {
      parts[index] = encodeText(partText.replace('/Parent 0 0 R', `/Parent ${pagesObjectId} 0 R`))
      currentLength += parts[index].length - part.length
      break
    }
  }

  const xrefOffset = currentLength
  pushPart(encodeText(`xref\n0 ${offsets.length}\n`))
  pushPart(encodeText('0000000000 65535 f \n'))
  offsets.slice(1).forEach((offset) => {
    pushPart(encodeText(`${String(offset).padStart(10, '0')} 00000 n \n`))
  })

  pushPart(
    encodeText(
      `trailer\n<< /Size ${offsets.length} /Root ${catalogObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    ),
  )

  return new Blob(parts, { type: 'application/pdf' })
}

const loadImageAsJpeg = async (url: string): Promise<PdfImageItem | null> => {
  try {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Unable to load image'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const context = canvas.getContext('2d')
    if (!context) return null

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return {
      data: bytes,
      width: canvas.width,
      height: canvas.height,
      x: 430,
      y: 608,
      displayWidth: 100,
      displayHeight: 120,
    }
  } catch {
    return null
  }
}

type ProfileState = {
  name: string
  email: string
  phone: string
  prn: string
  department: string
  address: string
  bio: string
  currentClass: string
  yearOfStudy: string
  gender: string
  dateOfBirth: string
  bloodGroup: string
  guardianName: string
  guardianPhone: string
  guardianRelation: string
  emergencyContactName: string
  emergencyContactPhone: string
  admissionDate: string
  academicYear: string
  birthPlace: string
  birthDistrict: string
  religion: string
  category: string
  casteSubCaste: string
  domicile: string
  seatType: string
  sscMarks: string
  sscOutOf: string
  sscPassingYear: string
  sscBoard: string
  hscMarks: string
  hscOutOf: string
  hscPassingYear: string
  hscBoard: string
  diplomaMarks: string
  diplomaOutOf: string
  diplomaPassingYear: string
  hscPhysicsMarks: string
  hscChemistryMarks: string
  hscMathematicsMarks: string
  hscTotalMarks: string
  lastInstitutionName: string
  city: string
  district: string
  state: string
  parentsIncome: string
  freeConcession: string
  numberOfChildren: string
  fatherName: string
  fatherAddress: string
  fatherOfficeAddress: string
  fatherDesignation: string
  fatherOccupation: string
  fatherEmail: string
  fatherMobile: string
  motherName: string
  motherOfficeAddress: string
  motherDesignation: string
  motherOccupation: string
  motherEmail: string
  motherMobile: string
  localGuardianName: string
  localGuardianAddress: string
  localGuardianOfficeAddress: string
  localGuardianDesignation: string
  localGuardianOccupation: string
  localGuardianEmail: string
  localGuardianMobile: string
  localResidence: string
  height: string
  weight: string
  maritalStatus: string
  allergyHistory: string
  photoUrl: string
  photoPath: string
}

const defaultProfile: ProfileState = {
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
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <h3 className="border-b border-border pb-2 text-lg font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

export default function StudentSettingsPage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileState>(defaultProfile)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

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
      })
    }
  }, [user])

  const updateField = (key: keyof ProfileState, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)

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
        .eq('id', user.id)

      if (error) {
        alert('Error saving profile: ' + error.message)
      } else {
        alert('Profile saved successfully!')
      }
    } catch {
      alert('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = async () => {
    const items: PdfTextItem[] = [
      { text: COLLEGE_NAME, x: getCenteredX(COLLEGE_NAME, 16), y: 808, size: 16 },
      { text: COLLEGE_SUBTITLE, x: getCenteredX(COLLEGE_SUBTITLE, 11), y: 788, size: 11 },
      { text: DEPARTMENT_NAME, x: getCenteredX(DEPARTMENT_NAME, 14), y: 770, size: 14 },
      { text: FORM_TITLE, x: getCenteredX(FORM_TITLE, 13), y: 748, size: 13 },
      { text: 'Photo', x: 484, y: 708, size: 10 },
      { text: '_______________________________________________', x: 30, y: 724, size: 10 },
      { text: `Name in full ${profile.name || '_______________________________________________________________'}`, x: 30, y: 690, size: 10 },
      {
        text: `Admission date ${profile.admissionDate ? profile.admissionDate.replace(/-/g, ' / ') : '__ / __ / ________'}  Year ${profile.academicYear || '________'}  PRN No. ${profile.prn || '____________________'}`,
        x: 30,
        y: 670,
        size: 10,
      },
      {
        text: `Gender: ${profile.gender || 'M/F'}  Birth date ${profile.dateOfBirth || '____________'}  Birth place ${profile.birthPlace || '__________'}  Birth Dist. ${profile.birthDistrict || '___________'}`,
        x: 30,
        y: 650,
        size: 10,
      },
      {
        text: `Religion ${profile.religion || '______________'}  Category ${profile.category || '___________'}`,
        x: 30,
        y: 632,
        size: 10,
      },
      {
        text: `Caste/Sub Caste ${profile.casteSubCaste || '__________________'}  Domicile ${profile.domicile || '___________'}  Blood Group ${profile.bloodGroup || '_______'}`,
        x: 30,
        y: 614,
        size: 10,
      },
      {
        text: `Seat type: CET Merit/Management/Trust quota ${profile.seatType || '__________________'}`,
        x: 30,
        y: 596,
        size: 10,
      },
      {
        text: `SSC Marks: ${profile.sscMarks || '______'} out of ${profile.sscOutOf || '____'} Passing Year ${profile.sscPassingYear || '______'} SSC Board ${profile.sscBoard || '____________________'}`,
        x: 30,
        y: 560,
        size: 10,
      },
      {
        text: `HSC Marks: ${profile.hscMarks || '______'} out of ${profile.hscOutOf || '____'} Passing Year ${profile.hscPassingYear || '______'} HSC Board ${profile.hscBoard || '____________________'}`,
        x: 30,
        y: 542,
        size: 10,
      },
      {
        text: `Diploma Marks: ${profile.diplomaMarks || '______'} out of ${profile.diplomaOutOf || '____'} Passing Year ${profile.diplomaPassingYear || '______'}`,
        x: 30,
        y: 524,
        size: 10,
      },
      {
        text: `Marks obtained in HSC- physics ${profile.hscPhysicsMarks || '______'} Chemistry ${profile.hscChemistryMarks || '______'} Mathematics ${profile.hscMathematicsMarks || '______'} Total ${profile.hscTotalMarks || '______'} Out of ${profile.hscOutOf || '____'}`,
        x: 30,
        y: 506,
        size: 10,
      },
      {
        text: `Name of Institution last attended (HSC/Diploma) ${profile.lastInstitutionName || '______________________________________________'}`,
        x: 30,
        y: 488,
        size: 10,
      },
      {
        text: `City: ${profile.city || '__________'} District: ${profile.district || '____________'} State: ${profile.state || '________________'}`,
        x: 30,
        y: 470,
        size: 10,
      },
      {
        text: `Parents Income ${profile.parentsIncome || '____________'} Free concession Yes/No Type: ${profile.freeConcession || '____________'} No of Childs ${profile.numberOfChildren || '________'}`,
        x: 30,
        y: 452,
        size: 10,
      },
      {
        text: `Father Name (in full) ${profile.fatherName || '________________________________________________________________'}`,
        x: 30,
        y: 434,
        size: 10,
      },
      {
        text: `Father’s permanent Residence address ${profile.fatherAddress || '______________________________________________________'}`,
        x: 30,
        y: 416,
        size: 10,
      },
      { text: '_______________________________________________________________________________________________', x: 30, y: 400, size: 10 },
      {
        text: `Office address ${profile.fatherOfficeAddress || '______________________________'} Designation ${profile.fatherDesignation || '________________'}`,
        x: 30,
        y: 382,
        size: 10,
      },
      {
        text: `Occupation ${profile.fatherOccupation || '________________'} E Mail ${profile.fatherEmail || '______________________'} Mobile No. ${profile.fatherMobile || '__________________'}`,
        x: 30,
        y: 364,
        size: 10,
      },
      {
        text: `Mother Name (in full) ${profile.motherName || '________________________________________________________________'}`,
        x: 30,
        y: 346,
        size: 10,
      },
      {
        text: `Office address ${profile.motherOfficeAddress || '______________________________'} Designation ${profile.motherDesignation || '________________'}`,
        x: 30,
        y: 328,
        size: 10,
      },
      {
        text: `Occupation ${profile.motherOccupation || '________________'} E Mail ${profile.motherEmail || '______________________'} Mobile No. ${profile.motherMobile || '__________________'}`,
        x: 30,
        y: 310,
        size: 10,
      },
      {
        text: `Local Guardian name (in full) ${profile.localGuardianName || '___________________________________________________________'}`,
        x: 30,
        y: 292,
        size: 10,
      },
      {
        text: `and his permanent address ${profile.localGuardianAddress || '___________________________________________________________'}`,
        x: 30,
        y: 274,
        size: 10,
      },
      {
        text: `Office address ${profile.localGuardianOfficeAddress || '______________________________'} Designation ${profile.localGuardianDesignation || '________________'}`,
        x: 30,
        y: 256,
        size: 10,
      },
      {
        text: `Occupation ${profile.localGuardianOccupation || '________________'} E Mail ${profile.localGuardianEmail || '______________________'} Mobile No. ${profile.localGuardianMobile || '__________________'}`,
        x: 30,
        y: 238,
        size: 10,
      },
      {
        text: `Student’s local residence: College Hostel/Private Room/Private Hostel/ Other ${profile.localResidence || '______________________________'}`,
        x: 30,
        y: 220,
        size: 10,
      },
      {
        text: `Height: ${profile.height || '____________'} Weight: ${profile.weight || '____________'} Married ${profile.maritalStatus || '________________'}`,
        x: 30,
        y: 202,
        size: 10,
      },
      {
        text: 'I hereby declare that information given is correct. I undertake to observe and abide by the rules and regulations of the',
        x: 30,
        y: 172,
        size: 9,
      },
      {
        text: 'college. I undertake to make good any damage or loss caused by me to the property of the college or other students etc. and',
        x: 30,
        y: 160,
        size: 9,
      },
      {
        text: 'pays all the fees in time.',
        x: 30,
        y: 148,
        size: 9,
      },
      {
        text: 'Document: 1) Aadhar card 2) CET Score card / Diploma Mark sheet, 3) Mark sheet of FY/SY/TY',
        x: 30,
        y: 132,
        size: 9,
      },
      {
        text: `Optional Info -Any allergic and or disease history for precautions ${profile.allergyHistory || '_____________________________________________'}`,
        x: 30,
        y: 116,
        size: 9,
      },
    ]

    items.push(
      { text: "Student's Name & Signature", x: 35, y: 45, size: 10 },
      { text: 'Parent/Guardians Name & Signature', x: getRightAlignedX('Parent/Guardians Name & Signature', 10), y: 45, size: 10 },
    )

    const photoImage = profile.photoUrl ? await loadImageAsJpeg(profile.photoUrl) : null
    const blob = buildPdfBlob(items, photoImage || undefined)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${(profile.prn || 'student-mentorship-form').replace(/\s+/g, '-').toLowerCase()}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const renderInput = (key: keyof ProfileState, label: string, props?: { type?: string; disabled?: boolean }) => (
    <div className="space-y-2">
      <Label htmlFor={String(key)}>{label}</Label>
      <Input
        id={String(key)}
        type={props?.type || 'text'}
        value={profile[key]}
        disabled={props?.disabled}
        onChange={(e) => updateField(key, e.target.value)}
        className={props?.disabled ? 'bg-secondary border-border text-muted-foreground' : 'bg-input border-border'}
      />
    </div>
  )

  const renderSelect = (
    key: keyof ProfileState,
    label: string,
    options: string[],
    placeholder = 'Select option',
  ) => (
    <div className="space-y-2">
      <Label htmlFor={String(key)}>{label}</Label>
      <select
        id={String(key)}
        value={profile[key]}
        onChange={(e) => updateField(key, e.target.value)}
        className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user) return

    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)

    const extension = file.name.split('.').pop() || 'jpg'
    const filePath = `${user.id}/student-photo.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('student-profile-photos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setIsUploadingPhoto(false)
      alert('Unable to upload photo: ' + uploadError.message)
      return
    }

    const { data } = supabase.storage
      .from('student-profile-photos')
      .getPublicUrl(filePath)

    setProfile((current) => ({
      ...current,
      photoPath: filePath,
      photoUrl: data.publicUrl,
    }))

    setIsUploadingPhoto(false)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fill the student mentorship form details here.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleDownload} disabled={loading}>
          <Download className="w-4 h-4" />
          Download Form
        </Button>
      </div>

      {loading ? (
        <Card className="border-border p-6 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </Card>
      ) : (
        <Card className="border-border p-6 space-y-8">
          <Section title="Photo">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-40 w-32 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {profile.photoUrl ? (
                  <Image
                    src={profile.photoUrl}
                    alt="Student photo"
                    width={128}
                    height={160}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">No photo</span>
                )}
              </div>
              <div className="space-y-3">
                <Label htmlFor="studentPhoto">Upload Photo</Label>
                <Input
                  id="studentPhoto"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="max-w-sm bg-input border-border"
                />
                <p className="text-sm text-muted-foreground">
                  {isUploadingPhoto ? 'Uploading photo...' : 'Upload a passport-size photo for the mentorship form.'}
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
              <Textarea
                id="address"
                value={profile.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="min-h-20 bg-input border-border"
              />
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
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                className="min-h-20 bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergyHistory">Optional Info - Any allergic and disease history for precautions</Label>
              <Textarea
                id="allergyHistory"
                value={profile.allergyHistory}
                onChange={(e) => updateField('allergyHistory', e.target.value)}
                className="min-h-20 bg-input border-border"
              />
            </div>
          </Section>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
