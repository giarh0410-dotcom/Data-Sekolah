import ExcelJS from 'exceljs';

export async function importFromExcel(file: File, type: string): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);
  
  const worksheet = workbook.worksheets[0];
  const data: any[] = [];
  
  // Data starts from row 7 or 8 (depending on type)
  const startRow = type === 'students' ? 8 : 7;
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < startRow) return;

    const values = row.values as any[];
    
    const formatDate = (val: any) => {
      if (!val) return '';
      if (val instanceof Date) {
        return val.toISOString().split('T')[0];
      }
      return val.toString();
    };

    if (type === 'students') {
      data.push({
        name: values[2],
        gender: values[3] === 'L' ? 'Male' : 'Female',
        nis: values[4]?.toString() || '',
        nisn: values[5]?.toString() || '',
        participantNumber: values[6]?.toString() || '',
        nik: values[7]?.toString() || '',
        class: values[8]?.toString() || '',
        rombel: values[9]?.toString() || '',
        pob: values[10]?.toString() || '',
        dob: formatDate(values[11]),
        akteRegNo: values[12]?.toString() || '',
        religion: values[13]?.toString() || '',
        noKK: values[14]?.toString() || '',
        address: values[15]?.toString() || '',
        kkAddress: values[16]?.toString() || '',
        previousSchool: values[17]?.toString() || '',
        childOrder: values[18]?.toString() || '',
        siblingsCount: values[19]?.toString() || '',
        height: values[20]?.toString() || '',
        weight: values[21]?.toString() || '',
        phone: values[22]?.toString() || '',
        email: values[23]?.toString() || '',
        fatherName: values[24]?.toString() || '',
        fatherNik: values[24]?.toString() || '',
        fatherPob: values[25]?.toString() || '',
        fatherDob: formatDate(values[26]),
        fatherEducation: values[27]?.toString() || '',
        fatherOccupation: values[28]?.toString() || '',
        fatherIncome: values[29]?.toString() || '',
        fatherPhone: values[30]?.toString() || '',
        motherName: values[31]?.toString() || '',
        motherNik: values[32]?.toString() || '',
        motherPob: values[33]?.toString() || '',
        motherDob: formatDate(values[34]),
        motherEducation: values[35]?.toString() || '',
        motherOccupation: values[36]?.toString() || '',
        motherIncome: values[37]?.toString() || '',
        motherPhone: values[38]?.toString() || '',
        guardianName: values[39]?.toString() || '',
        guardianNik: values[40]?.toString() || '',
        guardianPob: values[41]?.toString() || '',
        guardianDob: formatDate(values[42]),
        guardianEducation: values[43]?.toString() || '',
        guardianOccupation: values[44]?.toString() || '',
        guardianIncome: values[45]?.toString() || '',
      });
    }
 else if (type === 'teachers') {
      data.push({
        name: values[2],
        employeeId: values[3]?.toString() || '',
        subject: values[4]?.toString() || '',
        position: values[5]?.toString() || '',
        gender: values[6] === 'L' ? 'Male' : 'Female',
        nuptk: values[7]?.toString() || '',
        skYayasan: values[8]?.toString() || '',
        skMengajar: values[9]?.toString() || '',
        education: values[10]?.toString() || '',
        phone: values[11]?.toString() || '',
        email: values[12]?.toString() || '',
        address: values[13]?.toString() || '',
      });
    } else if (type === 'staff') {
      data.push({
        name: values[2],
        employeeId: values[3]?.toString() || '',
        position: values[4]?.toString() || '',
        gender: values[5] === 'L' ? 'Male' : 'Female',
        nuptk: values[6]?.toString() || '',
        skYayasan: values[7]?.toString() || '',
        education: values[8]?.toString() || '',
        phone: values[9]?.toString() || '',
        email: values[10]?.toString() || '',
        address: values[11]?.toString() || '',
      });
    }
  });

  return data.filter(item => item.name); // Filter out empty rows
}
