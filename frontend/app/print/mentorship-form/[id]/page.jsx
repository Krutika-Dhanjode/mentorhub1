"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PrintMentorshipFormPage({ params }) {
    const { id } = use(params);
    const supabase = createClient();
    const [studentProfile, setStudentProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudent = async () => {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", id)
                .single();
            
            if (!error && data) {
                setStudentProfile(data);
            }
            setLoading(false);
            
            // Auto trigger print dialogue shortly after rendering
            setTimeout(() => {
                window.print();
            }, 500);
        };
        fetchStudent();
    }, [id]);

    if (loading) return <div className="p-10 font-sans text-center">Preparing Document...</div>;
    if (!studentProfile) return <div className="p-10 font-sans text-center text-red-600">Student not found</div>;

    const v = (val) => val || "____________________";
    const vSmall = (val) => val ? val : "________";

    return (
        <div className="bg-white min-h-screen text-black font-serif print:p-0 p-8 text-[13px] leading-relaxed mx-auto max-w-[800px]">
            {/* Header section matching Walchand specific format */}
            <div className="text-center mb-4 relative">
                {/* College Header */}
                <h1 className="text-[#e2000f] font-bold text-2xl uppercase tracking-widest mb-1" style={{ fontFamily: 'Times New Roman, serif' }}>
                    WALCHAND COLLEGE OF ENGINEERING, SANGLI
                </h1>
                <p className="text-sm font-medium mb-1">(Government Aided Autonomous Institute)</p>
                <h2 className="font-bold text-[17px] mb-2">Department of Information Technology</h2>
                
                {/* Red divider */}
                <div className="w-full border-t-[1.5px] border-dashed border-[#e2000f] my-3"></div>
                
                {/* Form Title */}
                <h3 className="font-bold text-xl underline underline-offset-[6px] decoration-[2px] mb-6 uppercase">STUDENTS MENTORSHIP FORM</h3>

                {/* Photo box floating right */}
                <div className="absolute right-2 top-16 w-32 h-40 border-2 border-black flex flex-col items-center justify-center bg-gray-50/30 overflow-hidden shadow-sm">
                    {studentProfile.photo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={studentProfile.photo_url} alt="Profile Photo" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-[10px] font-bold uppercase text-gray-400">Photo</span>
                    )}
                </div>
            </div>

            {/* Form Fields matching the provided layout exactly */}
            <div className="space-y-[10px] w-full max-w-[550px] sm:max-w-full">
                
                <div className="flex gap-2">
                    <span className="whitespace-nowrap">Name in full</span>
                    <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.name)}</span>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                    <span>Admission date</span>
                    <span className="border-b-[1px] border-black/50 border-dotted px-4">{vSmall(studentProfile.admission_date)}</span>
                    <span className="ml-2">Year</span>
                    <span className="border-b-[1px] border-black/50 border-dotted px-4 w-20">{vSmall(studentProfile.academic_year)}</span>
                    <span className="ml-4">PRN No.</span>
                    <span className="border-b-[1px] border-black/50 border-dotted flex-1 min-w-[120px] px-2">{v(studentProfile.prn)}</span>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                    <span>Gender: {studentProfile.gender === 'Male' ? 'M' : studentProfile.gender === 'Female' ? 'F' : 'M/F'}</span>
                    <span className="ml-4">Birth date</span>
                    <span className="border-b-[1px] border-black/50 border-dotted px-4 w-28">{vSmall(studentProfile.date_of_birth)}</span>
                    <span className="ml-2">Birth place</span>
                    <span className="border-b-[1px] border-black/50 border-dotted px-4 w-32">{vSmall(studentProfile.birth_place)}</span>
                    <span className="ml-2">Birth Dist.</span>
                    <span className="border-b-[1px] border-black/50 border-dotted flex-1 min-w-[100px] px-2">{vSmall(studentProfile.birth_district)}</span>
                </div>

                <div className="flex items-center gap-1">
                    <span>Religion</span>
                    <span className="border-b-[1px] border-black/50 border-dotted px-4 w-32">{vSmall(studentProfile.religion)}</span>
                    <span className="ml-2">Category</span>
                    <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-4">{vSmall(studentProfile.category)}</span>
                </div>

                <div className="flex items-center gap-1 flex-wrap mt-6">
                    <span>Caste/Sub Caste</span>
                    <span className="border-b-[1px] border-black/50 border-dotted px-4 w-40">{vSmall(studentProfile.caste_sub_caste)}</span>
                    <span className="ml-2">Domicile</span>
                    <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-4">{vSmall(studentProfile.domicile)}</span>
                    <span className="ml-2">Blood Group</span>
                    <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{vSmall(studentProfile.blood_group)}</span>
                </div>

                <div className="flex items-center gap-1">
                    <span>Seat type: CET Merit/Management/Trust quota</span>
                    <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-4">{v(studentProfile.seat_type)}</span>
                </div>

                {/* Academic Breakdown */}
                <div className="pt-4 space-y-3">
                    <div className="flex items-center gap-1 flex-wrap">
                        <span>SSC Marks:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-20">{vSmall(studentProfile.ssc_marks)}</span>
                        <span>out of</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-16">{vSmall(studentProfile.ssc_out_of)}</span>
                        <span className="ml-2">Passing Year</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-24">{vSmall(studentProfile.ssc_passing_year)}</span>
                        <span className="ml-2">SSC Board</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.ssc_board)}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                        <span>HSC Marks:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-20">{vSmall(studentProfile.hsc_marks)}</span>
                        <span>out of</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-16">{vSmall(studentProfile.hsc_out_of)}</span>
                        <span className="ml-2">Passing Year</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-24">{vSmall(studentProfile.hsc_passing_year)}</span>
                        <span className="ml-2">HSC Board</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.hsc_board)}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                        <span>Diploma Marks:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-20">{vSmall(studentProfile.diploma_marks)}</span>
                        <span>out of</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-16">{vSmall(studentProfile.diploma_out_of)}</span>
                        <span className="ml-2">Passing Year</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-4 min-w-[200px]">{vSmall(studentProfile.diploma_passing_year)}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap pt-1">
                        <span>Marks obtained in HSC- physics</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-3 w-16">{vSmall(studentProfile.hsc_physics_marks)}</span>
                        <span>Chemistry</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-3 w-16">{vSmall(studentProfile.hsc_chemistry_marks)}</span>
                        <span>Mathematics</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-3 w-16">{vSmall(studentProfile.hsc_mathematics_marks)}</span>
                        <span>Total</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-3 w-16">{vSmall(studentProfile.hsc_total_marks)}</span>
                        <span>Out of</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{vSmall(studentProfile.hsc_out_of)}</span>
                    </div>

                    <div className="flex gap-2">
                        <span className="whitespace-nowrap">Name of Institution last attended (HSC/Diploma)</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.last_institution_name)}</span>
                    </div>

                    <div className="flex gap-1 flex-wrap items-center">
                        <span>City:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-32">{vSmall(studentProfile.city)}</span>
                        <span className="ml-2">District:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-4 w-32">{vSmall(studentProfile.district)}</span>
                        <span className="ml-2">State:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.state)}</span>
                    </div>
                </div>

                {/* Family Details */}
                <div className="pt-2 space-y-3">
                    <div className="flex items-center gap-1 flex-wrap">
                        <span>Parents Income</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-32">{vSmall(studentProfile.parents_income)}</span>
                        <span className="ml-2">Free concession {studentProfile.free_concession ? 'Yes' : 'Yes/No'}</span>
                        <span className="ml-4">Type:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 flex-1">{vSmall(studentProfile.concession_type)}</span>
                        <span className="ml-2">No of Childs</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-16">{vSmall(studentProfile.number_of_children)}</span>
                    </div>

                    <div className="flex gap-2">
                        <span className="whitespace-nowrap">Father Name (in full)</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.father_name)}</span>
                    </div>

                    <div className="flex gap-2">
                        <span className="whitespace-nowrap">Father’s permanent Residence address</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.father_address)}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                        <span>Office address</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 min-w-[200px] px-2">{v(studentProfile.father_office_address)}</span>
                        <span className="ml-2">Designation</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.father_designation)}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                        <span>Occupation</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-32">{vSmall(studentProfile.father_occupation)}</span>
                        <span className="ml-2">E Mail</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 flex-1">{vSmall(studentProfile.father_email)}</span>
                        <span className="ml-2">Mobile No.</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-32">{vSmall(studentProfile.father_mobile)}</span>
                    </div>

                    {/* Mother */}
                    <div className="flex gap-2 pt-1">
                        <span className="whitespace-nowrap">Mother Name (in full)</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.mother_name)}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                        <span>Office address</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 min-w-[200px] px-2">{v(studentProfile.mother_office_address)}</span>
                        <span className="ml-2">Designation</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.mother_designation)}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                        <span>Occupation</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-32">{vSmall(studentProfile.mother_occupation)}</span>
                        <span className="ml-2">E Mail</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 flex-1">{vSmall(studentProfile.mother_email)}</span>
                        <span className="ml-2">Mobile No.</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-32">{vSmall(studentProfile.mother_mobile)}</span>
                    </div>

                    {/* Local Guardian */}
                    <div className="flex gap-2 pt-1">
                        <span className="whitespace-nowrap">Local Guardian name (in full)</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.local_guardian_name)}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="whitespace-nowrap">and his permanent address</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.local_guardian_address)}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                        <span>Office address</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 min-w-[200px] px-2">{v(studentProfile.local_guardian_office_address)}</span>
                        <span className="ml-2">Designation</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.local_guardian_designation)}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                        <span>Occupation</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-32">{vSmall(studentProfile.local_guardian_occupation)}</span>
                        <span className="ml-2">E Mail</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 flex-1">{vSmall(studentProfile.local_guardian_email)}</span>
                        <span className="ml-2">Mobile No.</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-32">{vSmall(studentProfile.local_guardian_mobile)}</span>
                    </div>

                    <div className="flex items-center gap-1 pt-2">
                        <span>Student’s local residence: {["College Hostel", "Private Room", "Private Hostel"].includes(studentProfile.local_residence) ? studentProfile.local_residence : 'College Hostel/Private Room/Private Hostel/ Other'}</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{!["College Hostel", "Private Room", "Private Hostel"].includes(studentProfile.local_residence) ? v(studentProfile.local_residence) : '_________________'}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                        <span>Height:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-28">{vSmall(studentProfile.height)}</span>
                        <span className="ml-2">Weight:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 w-28">{vSmall(studentProfile.weight)},</span>
                        <span className="ml-4">Married:</span>
                        <span className="border-b-[1px] border-black/50 border-dotted px-2 flex-1">{vSmall(studentProfile.marital_status)}</span>
                    </div>
                </div>

                {/* Declarations */}
                <div className="pt-4 text-[12.5px] text-justify leading-tight">
                    <p className="mb-2">
                        I hereby declare that information given is correct. I undertake to observe and abide by the rules and regulations of the
                        college. I undertake to make good any damage or loss caused by me to the property of the college or other students etc. and
                        pays all the fees in time.
                    </p>
                    <p className="font-semibold mb-2">
                        Document: 1) Aadhar card 2) CET Score card / Diploma Mark sheet, 3) Mark sheet of FY/SY/TY
                    </p>
                    <div className="flex gap-2">
                        <span className="whitespace-nowrap font-semibold">Optional Info -Any allergic and or disease history for precautions</span>
                        <span className="border-b-[1px] border-black/50 border-dotted flex-1 px-2">{v(studentProfile.allergy_history)}</span>
                    </div>
                </div>

                {/* Signature Blocks */}
                <div className="pt-20 pb-10 flex justify-between px-4">
                    <div className="text-center font-medium">
                        Student’s Name & Signature
                    </div>
                    <div className="text-center font-medium">
                        Parent/Guardians Name & Signature
                    </div>
                </div>

            </div>
        </div>
    );
}
