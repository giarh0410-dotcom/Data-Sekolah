import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportToExcel(data: any[], type: string, isTemplate: boolean = false) {
  const workbook = new ExcelJS.Workbook();
  const sheetName = type === 'students' ? 'Daftar Siswa' :
    type === 'teachers' ? 'Daftar Guru' :
      type === 'examRooms' ? 'Daftar Ruang Ujian' : 'Daftar Staf';
  const worksheet = workbook.addWorksheet(sheetName);

  // Define Columns and Headers based on type
  let headers: string[] = [];
  let columnWidths: number[] = [];

  if (type === 'students') {
    headers = [
      'No', 'Nama Lengkap', 'JK', 'NIS', 'NISN', 'No. Peserta', 'NIK Siswa', 'Kelas', 'Rombel',
      'Tempat Lahir', 'Tanggal Lahir', 'No. Reg Akte', 'Agama', 'No. KK',
      'Alamat Domisili', 'Alamat KK', 'Asal Sekolah', 'Anak Ke-', 'Jml Saudara',
      'Tinggi (cm)', 'Berat (kg)', 'Telepon', 'Email',
      'Nama Ayah', 'NIK Ayah', 'Tempat Lahir Ayah', 'Tgl Lahir Ayah', 'Pendidikan Ayah', 'Pekerjaan Ayah', 'Penghasilan Ayah', 'Telepon Ayah',
      'Nama Ibu', 'NIK Ibu', 'Tempat Lahir Ibu', 'Tgl Lahir Ibu', 'Pendidikan Ibu', 'Pekerjaan Ibu', 'Penghasilan Ibu', 'Telepon Ibu',
      'Nama Wali', 'NIK Wali', 'Tempat Lahir Wali', 'Tgl Lahir Wali', 'Pendidikan Wali', 'Pekerjaan Wali', 'Penghasilan Wali'
    ];
    columnWidths = [
      5, 30, 5, 12, 12, 20, 10, 10,
      20, 15, 20, 15, 20,
      40, 40, 25, 10, 12,
      12, 12, 15, 25,
      25, 20, 20, 15, 20, 20, 20, 15,
      25, 20, 20, 15, 20, 20, 20, 15,
      30, 20, 20, 15, 20, 20, 20
    ];
  } else if (type === 'teachers') {
    headers = [
      'No', 'Nama Lengkap', 'NIP/ID', 'Mata Pelajaran', 'Jabatan', 'Gender',
      'NUPTK', 'No. SK Yayasan', 'No. SK Mengajar', 'Pendidikan',
      'Telepon', 'Email', 'Alamat'
    ];
    columnWidths = [5, 30, 15, 20, 20, 10, 20, 20, 20, 25, 15, 25, 40];
  } else if (type === 'examRooms') {
    headers = [
      'No', 'Ruang Ujian', 'Lantai', 'Nama Peserta Ujian', 'No. Peserta', 'Kelas', 'Kelas'
    ];
    columnWidths = [5, 20, 15, 35, 15, 10, 20];
  } else {
    headers = [
      'No', 'Nama Lengkap', 'NIP/ID', 'Jabatan', 'Gender',
      'NUPTK', 'No. SK Yayasan', 'Pendidikan',
      'Telepon', 'Email', 'Alamat'
    ];
    columnWidths = [5, 30, 15, 20, 10, 20, 20, 25, 15, 25, 40];
  }

  worksheet.columns = columnWidths.map(w => ({ width: w }));

  // Header Info (Rows 1-4)
  const lastCol = headers.length;

  worksheet.getRow(1).height = 30;
  // Merge C1 to Last Column for Title
  worksheet.mergeCells(1, 3, 1, lastCol);
  const titleCell = worksheet.getCell(1, 3);
  titleCell.value = type === 'students' ? 'DAFTAR PESERTA DIDIK' :
    type === 'teachers' ? 'DAFTAR GURU / PENDIDIK' :
      type === 'examRooms' ? 'DAFTAR PESERTA RUANG UJIAN' : 'DAFTAR STAF / KARYAWAN';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { vertical: 'middle' };

  // Merge C2 to Last Column for School Name
  worksheet.mergeCells(2, 3, 2, lastCol);
  const schoolCell = worksheet.getCell(2, 3);
  schoolCell.value = 'SMP ISLAM MODERN AL FAKHIR';
  schoolCell.font = { bold: true, size: 16, color: { argb: 'FF006633' } };
  schoolCell.alignment = { vertical: 'middle' };

  // Merge C3 to Last Column for Address
  worksheet.mergeCells(3, 3, 3, lastCol);
  const addressCell = worksheet.getCell(3, 3);
  addressCell.value = 'Jl. Kemang RT. 03 RW. 06 Kel. Pasir Putih Kec. Sawangan, Kota Depok';
  addressCell.font = { size: 10 };
  addressCell.alignment = { vertical: 'middle' };

  // Merge C4 to Last Column for Tahun Pelajaran
  worksheet.mergeCells(4, 3, 4, lastCol);
  const tpCell = worksheet.getCell(4, 3);
  tpCell.value = 'Tahun Pelajaran 2026-2027';
  tpCell.font = { size: 10, italic: true };
  tpCell.alignment = { vertical: 'middle' };

  // Placeholder for Logo (A1:B4)
  worksheet.mergeCells(1, 1, 4, 2);
  const logoPlaceholder = worksheet.getCell(1, 1);
  logoPlaceholder.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add Logo Image
  try {
    const response = await fetch('/logo.png');
    const contentType = response.headers.get('Content-Type');

    if (response.ok && contentType && contentType.startsWith('image/')) {
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const logoId = workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 } as any,
        br: { col: 2, row: 4 } as any,
        editAs: 'oneCell'
      });
      logoPlaceholder.value = '';
    } else {
      logoPlaceholder.value = '[LOGO]';
      logoPlaceholder.font = { italic: true, color: { argb: 'FF999999' } };
    }
  } catch (error) {
    logoPlaceholder.value = '[LOGO]';
    logoPlaceholder.font = { italic: true, color: { argb: 'FF999999' } };
  }

  // Table Headers (Row 6 & 7)
  const headerRow1 = worksheet.getRow(6);
  const headerRow2 = worksheet.getRow(7);

  if (type === 'students') {
    // Grouped Headers
    worksheet.mergeCells(6, 1, 6, 22);
    const g1 = worksheet.getCell(6, 1);
    g1.value = 'DATA PRIBADI SISWA';
    g1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F3FF' } };

    worksheet.mergeCells(6, 23, 6, 30);
    const g2 = worksheet.getCell(6, 23);
    g2.value = 'DATA AYAH KANDUNG';
    g2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7ED' } };

    worksheet.mergeCells(6, 31, 6, 38);
    const g3 = worksheet.getCell(6, 31);
    g3.value = 'DATA IBU KANDUNG';
    g3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9E6' } };

    worksheet.mergeCells(6, 39, 6, 45);
    const g4 = worksheet.getCell(6, 39);
    g4.value = 'DATA WALI';
    g4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

    [g1, g2, g3, g4].forEach(cell => {
      cell.font = { bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    headerRow2.values = headers;
  } else {
    headerRow1.values = headers;
  }

  const styleHeader = (row: ExcelJS.Row) => {
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (!cell.fill && type !== 'examRooms') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }
    });
  };

  if (type === 'students') {
    styleHeader(headerRow2);
  } else {
    styleHeader(headerRow1);
  }

  // Data Rows
  if (type === 'examRooms') {
    let globalNo = 1;
    data.forEach((room) => {
      const studentsInRoom = room.studentsInRoom || [];
      if (studentsInRoom.length === 0) {
        const row = worksheet.addRow([
          globalNo++, room.name, room.location || '-', 'BELUM ADA PESERTA', '-', '-', '-'
        ]);
        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle' };
        });
        row.getCell(1).alignment = { horizontal: 'center' };
      } else {
        studentsInRoom.forEach((student: any, sIdx: number) => {
          const row = worksheet.addRow([
            globalNo++, room.name, room.location || '-', student.name, student.participantNumber || student.nisn || student.nis || '-', student.class || '-', student.rombel || '-'
          ]);
          row.eachCell((cell) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle' };
          });
          row.getCell(1).alignment = { horizontal: 'center' };
        });
      }
    });
  } else {
    data.forEach((item, index) => {
      let rowData: any[] = [];
      if (type === 'students') {
        rowData = [
          index + 1, item.name, item.gender === 'Male' ? 'L' : 'P', item.nis, item.nisn, item.participantNumber, item.nik, item.class, item.rombel,
          item.pob, item.dob, item.akteRegNo, item.religion, item.noKK,
          item.address, item.kkAddress, item.previousSchool, item.childOrder, item.siblingsCount,
          item.height, item.weight, item.phone, item.email,
          item.fatherName, item.fatherNik, item.fatherPob, item.fatherDob, item.fatherEducation, item.fatherOccupation, item.fatherIncome, item.fatherPhone,
          item.motherName, item.motherNik, item.motherPob, item.motherDob, item.motherEducation, item.motherOccupation, item.motherIncome, item.motherPhone,
          item.guardianName, item.guardianNik, item.guardianPob, item.guardianDob, item.guardianEducation, item.guardianOccupation, item.guardianIncome
        ];
      } else if (type === 'teachers') {
        rowData = [
          index + 1, item.name, item.employeeId, item.subject, item.position, item.gender === 'Male' ? 'L' : 'P',
          item.nuptk, item.skYayasan, item.skMengajar, item.education,
          item.phone, item.email, item.address
        ];
      } else {
        rowData = [
          index + 1, item.name, item.employeeId, item.position, item.gender === 'Male' ? 'L' : 'P',
          item.nuptk, item.skYayasan, item.education,
          item.phone, item.email, item.address
        ];
      }

      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle' };
      });

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
    });
  }

  // Generate and save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = isTemplate
    ? type === 'examRooms' ? `Template_Ruang_Ujian_SMP_Al_Fakhir.xlsx` : `Template_Import_${type}_SMP_Al_Fakhir.xlsx`
    : type === 'examRooms' ? (data.length === 1 ? `Daftar_Peserta_Ruang_${data[0].name.replace(/\s+/g, '_')}.xlsx` : `Daftar_Peserta_Semua_Ruang_Ujian.xlsx`) : `Data_${type}_SMP_Islam_Modern_Al_Fakhir_2026-2027.xlsx`;
  saveAs(blob, fileName);
}
