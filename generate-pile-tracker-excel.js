const ExcelJS = require('exceljs');

async function createPileTrackerExcel() {
  const workbook = new ExcelJS.Workbook();

  // Set workbook properties
  workbook.creator = 'PileTrackerPro';
  workbook.lastModifiedBy = 'PileTrackerPro';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ============================================
  // 1. CONFIGURATION SHEET
  // ============================================
  const configSheet = workbook.addWorksheet('Configuration', {
    views: [{ showGridLines: true }]
  });

  // Set column widths
  configSheet.columns = [
    { width: 3 },
    { width: 30 },
    { width: 20 },
    { width: 50 },
    { width: 3 }
  ];

  // Title
  configSheet.mergeCells('B2:D2');
  const configTitle = configSheet.getCell('B2');
  configTitle.value = 'PROJECT CONFIGURATION';
  configTitle.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  configTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  configTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' }
  };
  configSheet.getRow(2).height = 30;

  // Project Settings Section
  configSheet.mergeCells('B4:C4');
  const settingsTitle = configSheet.getCell('B4');
  settingsTitle.value = 'Project Settings';
  settingsTitle.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  settingsTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  settingsTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  configSheet.getRow(4).height = 25;

  configSheet.getCell('B5').value = 'Embedment Tolerance (ft):';
  configSheet.getCell('B5').font = { bold: true };
  configSheet.getCell('C5').value = 1;
  configSheet.getCell('C5').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDBEAFE' }
  };
  configSheet.getCell('D5').value = 'Change this value to adjust your project tolerance';
  configSheet.getCell('D5').font = { italic: true, size: 10 };

  // Pile Types Section
  configSheet.mergeCells('B7:C7');
  const pileTypesTitle = configSheet.getCell('B7');
  pileTypesTitle.value = 'Pile Types (Customize Your Types Here)';
  pileTypesTitle.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  pileTypesTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF059669' }
  };
  pileTypesTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  configSheet.getRow(7).height = 25;

  configSheet.getCell('B8').value = 'Pile Type Name';
  configSheet.getCell('B8').font = { bold: true };
  configSheet.getCell('B8').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD1FAE5' }
  };
  configSheet.getCell('B8').alignment = { horizontal: 'center' };

  configSheet.getCell('C8').value = 'Description (Optional)';
  configSheet.getCell('C8').font = { bold: true };
  configSheet.getCell('C8').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD1FAE5' }
  };
  configSheet.getCell('C8').alignment = { horizontal: 'center' };

  // Default pile types (users can modify these)
  const defaultPileTypes = [
    { name: 'Type A', description: '12" Square Concrete Piles' },
    { name: 'Type B', description: '14" Square Concrete Piles' },
    { name: 'Type C', description: '16" Square Concrete Piles' },
    { name: 'Type D', description: 'H-Piles' },
    { name: '', description: 'Add more types as needed...' }
  ];

  defaultPileTypes.forEach((type, index) => {
    const rowNum = 9 + index;
    configSheet.getCell(`B${rowNum}`).value = type.name;
    configSheet.getCell(`C${rowNum}`).value = type.description;

    if (index % 2 === 0) {
      configSheet.getCell(`B${rowNum}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
      configSheet.getCell(`C${rowNum}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
    }
  });

  // Instructions
  configSheet.mergeCells('B15:D15');
  const configInstructions = configSheet.getCell('B15');
  configInstructions.value = 'INSTRUCTIONS: Edit the Pile Type names above to match your project. The dropdowns in Plot Plan and Field Data Entry will automatically use these values. Add or remove rows as needed.';
  configInstructions.alignment = { wrapText: true, vertical: 'top' };
  configInstructions.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF3C7' }
  };
  configSheet.getRow(15).height = 50;

  // ============================================
  // 2. PLOT PLAN SHEET
  // ============================================
  const plotPlanSheet = workbook.addWorksheet('Plot Plan', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // Define columns for Plot Plan (with flexible extra columns)
  plotPlanSheet.columns = [
    { header: 'Pile Name', key: 'pileName', width: 15 },
    { header: 'Pile Type', key: 'pileType', width: 20 },
    { header: 'Block', key: 'block', width: 15 },
    { header: 'Design Embedment (ft)', key: 'designEmbedment', width: 22 },
    { header: 'Location/Grid', key: 'location', width: 20 },
    { header: 'Custom Field 1', key: 'custom1', width: 20 },
    { header: 'Custom Field 2', key: 'custom2', width: 20 },
    { header: 'Custom Field 3', key: 'custom3', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 }
  ];

  // Style the header row
  plotPlanSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  plotPlanSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' } // Blue
  };
  plotPlanSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  plotPlanSheet.getRow(1).height = 25;

  // Add sample data
  const samplePlotData = [
    { pileName: 'P-001', pileType: 'Type A', block: 'Block 1', designEmbedment: 45, location: 'Grid A1', notes: '' },
    { pileName: 'P-002', pileType: 'Type A', block: 'Block 1', designEmbedment: 45, location: 'Grid A2', notes: '' },
    { pileName: 'P-003', pileType: 'Type B', block: 'Block 1', designEmbedment: 50, location: 'Grid A3', notes: '' },
    { pileName: 'P-004', pileType: 'Type B', block: 'Block 2', designEmbedment: 50, location: 'Grid B1', notes: '' },
    { pileName: 'P-005', pileType: 'Type C', block: 'Block 2', designEmbedment: 55, location: 'Grid B2', notes: '' }
  ];

  samplePlotData.forEach(data => {
    plotPlanSheet.addRow(data);
  });

  // Add data validation for Pile Type (rows 2-1000) - References Configuration sheet
  for (let i = 2; i <= 1000; i++) {
    plotPlanSheet.getCell(`B${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['Configuration!$B$9:$B$20'] // References the pile types in Configuration sheet
    };
  }

  // Add borders and alternating row colors
  for (let i = 2; i <= 1000; i++) {
    const row = plotPlanSheet.getRow(i);
    if (i % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' } // Light gray
      };
    }
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });
  }

  // ============================================
  // 2. FIELD DATA ENTRY SHEET
  // ============================================
  const fieldDataSheet = workbook.addWorksheet('Field Data Entry', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // Define columns for Field Data Entry (with flexible custom columns)
  fieldDataSheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Pile Name', key: 'pileName', width: 15 },
    { header: 'Inspector', key: 'inspector', width: 18 },
    { header: 'Start Time', key: 'startTime', width: 12 },
    { header: 'End Time', key: 'endTime', width: 12 },
    { header: 'Drive Time (min)', key: 'driveTime', width: 16 },
    { header: 'Embedment (ft)', key: 'embedment', width: 16 },
    { header: 'Refusal', key: 'refusal', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Design Embedment (ft)', key: 'designEmbedment', width: 22 },
    { header: 'Pile Type', key: 'pileType', width: 20 },
    { header: 'Block', key: 'block', width: 15 },
    { header: 'Custom Field 1', key: 'custom1', width: 20 },
    { header: 'Custom Field 2', key: 'custom2', width: 20 },
    { header: 'Custom Field 3', key: 'custom3', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 }
  ];

  // Style the header row
  fieldDataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  fieldDataSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF059669' } // Green
  };
  fieldDataSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  fieldDataSheet.getRow(1).height = 25;

  // Add sample field data
  const sampleFieldData = [
    { date: new Date('2025-01-15'), pileName: 'P-001', inspector: 'John Smith', startTime: '08:00', endTime: '08:45', embedment: 46, refusal: 'No' },
    { date: new Date('2025-01-15'), pileName: 'P-002', inspector: 'John Smith', startTime: '09:00', endTime: '09:30', embedment: 44.5, refusal: 'No' },
    { date: new Date('2025-01-16'), pileName: 'P-003', inspector: 'Jane Doe', startTime: '10:00', endTime: '11:15', embedment: 51, refusal: 'No' },
    { date: new Date('2025-01-16'), pileName: 'P-004', inspector: 'Jane Doe', startTime: '13:00', endTime: '13:25', embedment: 48, refusal: 'No' },
    { date: new Date('2025-01-17'), pileName: 'P-005', inspector: 'John Smith', startTime: '08:30', endTime: '09:45', embedment: 53, refusal: 'Yes' }
  ];

  sampleFieldData.forEach((data, index) => {
    const rowNum = index + 2;
    fieldDataSheet.addRow(data);

    // Add formula for Drive Time (column F)
    // Calculate minutes between start and end time
    fieldDataSheet.getCell(`F${rowNum}`).value = {
      formula: `IF(AND(D${rowNum}<>"",E${rowNum}<>""),((TIMEVALUE(E${rowNum})-TIMEVALUE(D${rowNum}))*24*60),"")`,
      result: null
    };

    // Add VLOOKUP formulas for Design Embedment, Pile Type, and Block from Plot Plan
    fieldDataSheet.getCell(`J${rowNum}`).value = {
      formula: `IFERROR(VLOOKUP(B${rowNum},'Plot Plan'!$A:$D,4,FALSE),"")`,
      result: null
    };

    fieldDataSheet.getCell(`K${rowNum}`).value = {
      formula: `IFERROR(VLOOKUP(B${rowNum},'Plot Plan'!$A:$B,2,FALSE),"")`,
      result: null
    };

    fieldDataSheet.getCell(`L${rowNum}`).value = {
      formula: `IFERROR(VLOOKUP(B${rowNum},'Plot Plan'!$A:$C,3,FALSE),"")`,
      result: null
    };
  });

  // Set up formulas and data validation for all rows (2-1000)
  for (let i = 2; i <= 1000; i++) {
    // Date format
    fieldDataSheet.getCell(`A${i}`).numFmt = 'mm/dd/yyyy';

    // Drive Time formula
    if (i > sampleFieldData.length + 1) {
      fieldDataSheet.getCell(`F${i}`).value = {
        formula: `IF(AND(D${i}<>"",E${i}<>""),((TIMEVALUE(E${i})-TIMEVALUE(D${i}))*24*60),"")`,
        result: null
      };
    }

    // Refusal data validation
    fieldDataSheet.getCell(`H${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Yes,No"']
    };

    // Status formula with tolerance calculation - References Configuration sheet for tolerance
    fieldDataSheet.getCell(`I${i}`).value = {
      formula: `IF(G${i}="","Pending",IF(G${i}>=J${i},"Accepted",IF(G${i}>=(J${i}-Configuration!$C$5),"Tolerance","Refusal")))`,
      result: null
    };

    // VLOOKUP formulas for auto-population
    if (i > sampleFieldData.length + 1) {
      fieldDataSheet.getCell(`J${i}`).value = {
        formula: `IFERROR(VLOOKUP(B${i},'Plot Plan'!$A:$D,4,FALSE),"")`,
        result: null
      };

      fieldDataSheet.getCell(`K${i}`).value = {
        formula: `IFERROR(VLOOKUP(B${i},'Plot Plan'!$A:$B,2,FALSE),"")`,
        result: null
      };

      fieldDataSheet.getCell(`L${i}`).value = {
        formula: `IFERROR(VLOOKUP(B${i},'Plot Plan'!$A:$C,3,FALSE),"")`,
        result: null
      };
    }

    // Conditional formatting for Status column
    const statusCell = fieldDataSheet.getCell(`I${i}`);

    // Add borders and alternating colors
    const row = fieldDataSheet.getRow(i);
    if (i % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
    }
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });
  }

  // Add conditional formatting rules for Status column
  fieldDataSheet.addConditionalFormatting({
    ref: 'I2:I1000',
    rules: [
      {
        type: 'containsText',
        operator: 'containsText',
        text: 'Accepted',
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FF10B981' }
          },
          font: {
            color: { argb: 'FFFFFFFF' },
            bold: true
          }
        }
      },
      {
        type: 'containsText',
        operator: 'containsText',
        text: 'Tolerance',
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFF59E0B' }
          },
          font: {
            color: { argb: 'FFFFFFFF' },
            bold: true
          }
        }
      },
      {
        type: 'containsText',
        operator: 'containsText',
        text: 'Refusal',
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFEF4444' }
          },
          font: {
            color: { argb: 'FFFFFFFF' },
            bold: true
          }
        }
      },
      {
        type: 'containsText',
        operator: 'containsText',
        text: 'Pending',
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FF6B7280' }
          },
          font: {
            color: { argb: 'FFFFFFFF' },
            bold: true
          }
        }
      }
    ]
  });

  // Conditional formatting for Refusal column
  fieldDataSheet.addConditionalFormatting({
    ref: 'H2:H1000',
    rules: [
      {
        type: 'containsText',
        operator: 'containsText',
        text: 'Yes',
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFFECACA' }
          },
          font: {
            color: { argb: 'FF991B1B' },
            bold: true
          }
        }
      }
    ]
  });

  // Conditional formatting for Drive Time > 60 minutes (slow drive)
  fieldDataSheet.addConditionalFormatting({
    ref: 'F2:F1000',
    rules: [
      {
        type: 'cellIs',
        operator: 'greaterThan',
        formulae: [60],
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFFEF3C7' }
          },
          font: {
            color: { argb: 'FF92400E' },
            bold: true
          }
        }
      }
    ]
  });

  // ============================================
  // 3. DASHBOARD SHEET
  // ============================================
  const dashboardSheet = workbook.addWorksheet('Dashboard', {
    views: [{ showGridLines: false }]
  });

  // Set column widths for dashboard layout
  dashboardSheet.columns = [
    { width: 3 },
    { width: 25 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 3 }
  ];

  // Title
  dashboardSheet.mergeCells('B2:G2');
  const titleCell = dashboardSheet.getCell('B2');
  titleCell.value = 'PILE TRACKER PRO - DASHBOARD';
  titleCell.font = { bold: true, size: 20, color: { argb: 'FF1F2937' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  dashboardSheet.getRow(2).height = 35;

  // Project Information Section
  dashboardSheet.mergeCells('B4:C4');
  const projectInfoTitle = dashboardSheet.getCell('B4');
  projectInfoTitle.value = 'PROJECT INFORMATION';
  projectInfoTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  projectInfoTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  projectInfoTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  dashboardSheet.getRow(4).height = 25;

  dashboardSheet.getCell('B5').value = 'Embedment Tolerance (ft):';
  dashboardSheet.getCell('B5').font = { bold: true };
  dashboardSheet.getCell('C5').value = { formula: '=Configuration!C5', result: null };
  dashboardSheet.getCell('C5').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDBEAFE' }
  };

  dashboardSheet.getCell('B6').value = 'Report Generated:';
  dashboardSheet.getCell('B6').font = { bold: true };
  dashboardSheet.getCell('C6').value = { formula: 'TODAY()', result: null };
  dashboardSheet.getCell('C6').numFmt = 'mm/dd/yyyy';
  dashboardSheet.getCell('C6').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDBEAFE' }
  };

  // Overall Statistics Section
  dashboardSheet.mergeCells('B8:D8');
  const statsTitle = dashboardSheet.getCell('B8');
  statsTitle.value = 'OVERALL STATISTICS';
  statsTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  statsTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF059669' }
  };
  statsTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  dashboardSheet.getRow(8).height = 25;

  // Statistics headers
  const statHeaders = ['Metric', 'Count', 'Percentage'];
  statHeaders.forEach((header, index) => {
    const cell = dashboardSheet.getCell(9, index + 2);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF047857' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Statistics rows
  const stats = [
    { label: 'Total Piles Planned', formula: 'COUNTA(\'Plot Plan\'!A2:A1000)' },
    { label: 'Total Piles Installed', formula: 'COUNTA(\'Field Data Entry\'!B2:B1000)' },
    { label: 'Accepted', formula: 'COUNTIF(\'Field Data Entry\'!I:I,"Accepted")' },
    { label: 'Tolerance', formula: 'COUNTIF(\'Field Data Entry\'!I:I,"Tolerance")' },
    { label: 'Refusal', formula: 'COUNTIF(\'Field Data Entry\'!I:I,"Refusal")' },
    { label: 'Pending', formula: 'COUNTIF(\'Field Data Entry\'!I:I,"Pending")' },
    { label: 'Refusals (Yes)', formula: 'COUNTIF(\'Field Data Entry\'!H:H,"Yes")' },
    { label: 'Slow Drive (>60 min)', formula: 'COUNTIF(\'Field Data Entry\'!F:F,">60")' }
  ];

  stats.forEach((stat, index) => {
    const rowNum = 10 + index;
    const labelCell = dashboardSheet.getCell(`B${rowNum}`);
    const countCell = dashboardSheet.getCell(`C${rowNum}`);
    const percentCell = dashboardSheet.getCell(`D${rowNum}`);

    labelCell.value = stat.label;
    labelCell.font = { bold: true };
    labelCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    countCell.value = { formula: stat.formula, result: null };
    countCell.alignment = { horizontal: 'center' };
    countCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Percentage formula (relative to total installed)
    if (index >= 2) {
      percentCell.value = {
        formula: `IF(C11>0,C${rowNum}/C11,0)`,
        result: null
      };
      percentCell.numFmt = '0.0%';
      percentCell.alignment = { horizontal: 'center' };
      percentCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    } else {
      percentCell.value = '-';
      percentCell.alignment = { horizontal: 'center' };
      percentCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    // Color coding for key metrics
    if (stat.label === 'Accepted') {
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' }
      };
    } else if (stat.label === 'Tolerance') {
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' }
      };
    } else if (stat.label === 'Refusal') {
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFECACA' }
      };
    }
  });

  // By Pile Type Section
  dashboardSheet.mergeCells('E8:G8');
  const pileTypeTitle = dashboardSheet.getCell('E8');
  pileTypeTitle.value = 'BY PILE TYPE';
  pileTypeTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  pileTypeTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7C3AED' }
  };
  pileTypeTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  // Pile Type headers
  const pileTypeHeaders = ['Type', 'Planned', 'Installed'];
  pileTypeHeaders.forEach((header, index) => {
    const cell = dashboardSheet.getCell(9, index + 5);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6D28D9' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Pile Type data - Uses dynamic references to Configuration sheet
  const defaultPileTypesForDashboard = ['Type A', 'Type B', 'Type C', 'Type D'];

  defaultPileTypesForDashboard.forEach((type, index) => {
    const rowNum = 10 + index;
    const typeCell = dashboardSheet.getCell(`E${rowNum}`);
    const plannedCell = dashboardSheet.getCell(`F${rowNum}`);
    const installedCell = dashboardSheet.getCell(`G${rowNum}`);

    // Reference Configuration sheet for pile type name
    typeCell.value = {
      formula: `=Configuration!B${9 + index}`,
      result: null
    };
    typeCell.font = { bold: true };
    typeCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    plannedCell.value = {
      formula: `COUNTIF('Plot Plan'!B:B,E${rowNum})`,
      result: null
    };
    plannedCell.alignment = { horizontal: 'center' };
    plannedCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    installedCell.value = {
      formula: `COUNTIF('Field Data Entry'!K:K,E${rowNum})`,
      result: null
    };
    installedCell.alignment = { horizontal: 'center' };
    installedCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Instructions Section
  dashboardSheet.mergeCells('B20:G20');
  const instructionsTitle = dashboardSheet.getCell('B20');
  instructionsTitle.value = 'INSTRUCTIONS';
  instructionsTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  instructionsTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6B7280' }
  };
  instructionsTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  dashboardSheet.getRow(20).height = 25;

  const instructions = [
    '1. PLOT PLAN: Enter your expected pile data (paste from your plot plan). This is your master list of piles to be installed.',
    '2. FIELD DATA ENTRY: Enter actual installation data. The spreadsheet will auto-populate pile type, block, and design embedment.',
    '3. FORMULAS: Drive time, status, and lookups are calculated automatically. Don\'t edit formula columns.',
    '4. STATUS CODES: Accepted (green), Tolerance (yellow), Refusal (red), Pending (gray)',
    '5. DASHBOARD: View real-time statistics and progress. All charts update automatically.',
    '6. TOLERANCE: Default is 1 ft. Modify in cell C5 if your project uses a different tolerance.'
  ];

  instructions.forEach((instruction, index) => {
    const rowNum = 21 + index;
    dashboardSheet.mergeCells(`B${rowNum}:G${rowNum}`);
    const cell = dashboardSheet.getCell(`B${rowNum}`);
    cell.value = instruction;
    cell.alignment = { vertical: 'top', wrapText: true };
    dashboardSheet.getRow(rowNum).height = 30;
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // ============================================
  // 4. BLOCK ANALYSIS SHEET
  // ============================================
  const blockAnalysisSheet = workbook.addWorksheet('Block Analysis', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // Define columns for Block Analysis
  blockAnalysisSheet.columns = [
    { header: 'Block', key: 'block', width: 15 },
    { header: 'Total Piles', key: 'total', width: 15 },
    { header: 'Accepted', key: 'accepted', width: 15 },
    { header: 'Tolerance', key: 'tolerance', width: 15 },
    { header: 'Refusal', key: 'refusal', width: 15 },
    { header: 'Pending', key: 'pending', width: 15 },
    { header: '% Complete', key: 'percentComplete', width: 15 },
    { header: 'Avg Drive Time', key: 'avgDriveTime', width: 18 }
  ];

  // Style the header row
  blockAnalysisSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  blockAnalysisSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC2626' }
  };
  blockAnalysisSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  blockAnalysisSheet.getRow(1).height = 25;

  // Add formulas for Block 1 and Block 2 (can be extended)
  const blocks = ['Block 1', 'Block 2', 'Block 3', 'Block 4'];

  blocks.forEach((block, index) => {
    const rowNum = index + 2;

    blockAnalysisSheet.getCell(`A${rowNum}`).value = block;
    blockAnalysisSheet.getCell(`A${rowNum}`).font = { bold: true };

    // Total piles in this block
    blockAnalysisSheet.getCell(`B${rowNum}`).value = {
      formula: `COUNTIF('Field Data Entry'!L:L,"${block}")`,
      result: null
    };
    blockAnalysisSheet.getCell(`B${rowNum}`).alignment = { horizontal: 'center' };

    // Accepted
    blockAnalysisSheet.getCell(`C${rowNum}`).value = {
      formula: `COUNTIFS('Field Data Entry'!L:L,"${block}",'Field Data Entry'!I:I,"Accepted")`,
      result: null
    };
    blockAnalysisSheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' };

    // Tolerance
    blockAnalysisSheet.getCell(`D${rowNum}`).value = {
      formula: `COUNTIFS('Field Data Entry'!L:L,"${block}",'Field Data Entry'!I:I,"Tolerance")`,
      result: null
    };
    blockAnalysisSheet.getCell(`D${rowNum}`).alignment = { horizontal: 'center' };

    // Refusal
    blockAnalysisSheet.getCell(`E${rowNum}`).value = {
      formula: `COUNTIFS('Field Data Entry'!L:L,"${block}",'Field Data Entry'!I:I,"Refusal")`,
      result: null
    };
    blockAnalysisSheet.getCell(`E${rowNum}`).alignment = { horizontal: 'center' };

    // Pending
    blockAnalysisSheet.getCell(`F${rowNum}`).value = {
      formula: `COUNTIFS('Field Data Entry'!L:L,"${block}",'Field Data Entry'!I:I,"Pending")`,
      result: null
    };
    blockAnalysisSheet.getCell(`F${rowNum}`).alignment = { horizontal: 'center' };

    // % Complete
    blockAnalysisSheet.getCell(`G${rowNum}`).value = {
      formula: `IF(B${rowNum}>0,(B${rowNum}-F${rowNum})/B${rowNum},0)`,
      result: null
    };
    blockAnalysisSheet.getCell(`G${rowNum}`).numFmt = '0.0%';
    blockAnalysisSheet.getCell(`G${rowNum}`).alignment = { horizontal: 'center' };

    // Avg Drive Time
    blockAnalysisSheet.getCell(`H${rowNum}`).value = {
      formula: `AVERAGEIF('Field Data Entry'!L:L,"${block}",'Field Data Entry'!F:F)`,
      result: null
    };
    blockAnalysisSheet.getCell(`H${rowNum}`).numFmt = '0.0';
    blockAnalysisSheet.getCell(`H${rowNum}`).alignment = { horizontal: 'center' };

    // Add borders
    const row = blockAnalysisSheet.getRow(rowNum);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });
  });

  // Add conditional formatting for % Complete
  blockAnalysisSheet.addConditionalFormatting({
    ref: 'G2:G100',
    rules: [
      {
        type: 'cellIs',
        operator: 'greaterThanOrEqual',
        formulae: [0.9],
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFD1FAE5' }
          },
          font: {
            color: { argb: 'FF065F46' },
            bold: true
          }
        }
      },
      {
        type: 'cellIs',
        operator: 'lessThan',
        formulae: [0.5],
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFFECACA' }
          },
          font: {
            color: { argb: 'FF991B1B' },
            bold: true
          }
        }
      }
    ]
  });

  // ============================================
  // 5. INSTRUCTIONS SHEET
  // ============================================
  const instructionsSheet = workbook.addWorksheet('Instructions', {
    views: [{ showGridLines: false }]
  });

  // Set column widths
  instructionsSheet.columns = [
    { width: 2 },
    { width: 80 },
    { width: 2 }
  ];

  // Title
  instructionsSheet.mergeCells('B2:B2');
  const instrTitle = instructionsSheet.getCell('B2');
  instrTitle.value = 'PILETRACKER PRO - USER GUIDE & INSTRUCTIONS';
  instrTitle.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  instrTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  instrTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' }
  };
  instructionsSheet.getRow(2).height = 40;

  // Welcome Section
  let currentRow = 4;
  instructionsSheet.getCell(`B${currentRow}`).value = 'Welcome to PileTrackerPro!';
  instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FF2563EB' } };
  currentRow++;

  instructionsSheet.getCell(`B${currentRow}`).value = 'This Excel template replicates the functionality of the PileTrackerPro web application, allowing you to track pile installation data offline with automatic calculations, visual analytics, and professional reporting.';
  instructionsSheet.getCell(`B${currentRow}`).alignment = { wrapText: true };
  instructionsSheet.getRow(currentRow).height = 30;
  currentRow += 2;

  // Customization Section (NEW)
  instructionsSheet.getCell(`B${currentRow}`).value = 'CUSTOMIZATION & FLEXIBILITY';
  instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  instructionsSheet.getCell(`B${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEA580C' }
  };
  instructionsSheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  instructionsSheet.getRow(currentRow).height = 25;
  currentRow++;

  const customizationInfo = [
    {
      title: 'Configuration Sheet - Your Control Center',
      content: 'The Configuration sheet is where you customize the template to match your project. Here you can: (1) Change the embedment tolerance, (2) Edit pile type names to match your engineering specs, (3) Add or remove pile types as needed. All dropdowns and formulas automatically update when you change these settings!',
      color: 'FFEA580C'
    },
    {
      title: 'Flexible CSV Import',
      content: 'Different engineering companies provide different CSV formats. This template includes 3 Custom Fields in both Plot Plan and Field Data Entry sheets. You can rename these column headers to match your CSV columns (e.g., "Pile Length", "Diameter", "Contractor", etc.) and paste your data directly. The core formulas won\'t be affected.',
      color: 'FF0891B2'
    },
    {
      title: 'How to Change Pile Types',
      content: 'Go to Configuration sheet → Edit the Pile Type Name column (cells B9-B20). Your changes will automatically update: (1) Dropdown lists in Plot Plan, (2) Dashboard "By Pile Type" section, (3) All references throughout the workbook. You can have as many or as few pile types as your project requires.',
      color: 'FF7C3AED'
    }
  ];

  customizationInfo.forEach(info => {
    currentRow++;
    instructionsSheet.getCell(`B${currentRow}`).value = info.title;
    instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 11, color: { argb: info.color } };
    instructionsSheet.getRow(currentRow).height = 20;
    currentRow++;

    instructionsSheet.getCell(`B${currentRow}`).value = info.content;
    instructionsSheet.getCell(`B${currentRow}`).alignment = { wrapText: true, indent: 1 };
    instructionsSheet.getRow(currentRow).height = 60;
    instructionsSheet.getCell(`B${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };
    currentRow++;
  });

  currentRow += 1;

  // How to Use Section
  instructionsSheet.getCell(`B${currentRow}`).value = 'HOW TO USE THIS SPREADSHEET';
  instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  instructionsSheet.getCell(`B${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF059669' }
  };
  instructionsSheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  instructionsSheet.getRow(currentRow).height = 25;
  currentRow++;

  const steps = [
    {
      title: '1. Configure Your Project in CONFIGURATION Sheet',
      content: 'Start here! Customize pile types to match your engineering specifications. Edit the pile type names in column B (cells B9-B20) - these will auto-populate in all dropdowns. Adjust the embedment tolerance if your project uses a different value than the default 1 ft. This sheet is your control center for project-specific settings.',
      color: 'FF1F2937'
    },
    {
      title: '2. Enter Plot Plan Data in PLOT PLAN Sheet',
      content: 'This is your master list of expected piles. Paste your pile plot plan data here, or enter it manually. The template includes 3 Custom Fields - rename these headers to match any extra columns in your CSV (e.g., "Pile Length", "Diameter"). Pile Type dropdown will show your configured types from step 1.',
      color: 'FF2563EB'
    },
    {
      title: '3. Enter Field Data in FIELD DATA ENTRY Sheet',
      content: 'As piles are installed, log the actual data here. When you enter a Pile Name that exists in the Plot Plan, the Design Embedment, Pile Type, and Block will auto-populate via VLOOKUP formulas. Enter the date, inspector name, start/end times, embedment, and whether there was refusal. The Drive Time and Status will calculate automatically using your configured tolerance.',
      color: 'FF059669'
    },
    {
      title: '4. Monitor Progress on the DASHBOARD',
      content: 'View real-time statistics including total piles planned vs installed, status breakdown (Accepted/Tolerance/Refusal/Pending), and performance metrics. All numbers update automatically as you add field data. The "By Pile Type" section dynamically shows your configured pile types.',
      color: 'FF7C3AED'
    },
    {
      title: '5. Analyze Performance in BLOCK ANALYSIS',
      content: 'See detailed metrics for each block including acceptance rates, average drive times, and completion percentages. Great for identifying problem areas or high-performing blocks.',
      color: 'FFDC2626'
    }
  ];

  steps.forEach(step => {
    currentRow++;
    instructionsSheet.getCell(`B${currentRow}`).value = step.title;
    instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 12, color: { argb: step.color } };
    instructionsSheet.getRow(currentRow).height = 20;
    currentRow++;

    instructionsSheet.getCell(`B${currentRow}`).value = step.content;
    instructionsSheet.getCell(`B${currentRow}`).alignment = { wrapText: true, indent: 2 };
    instructionsSheet.getRow(currentRow).height = 45;
    currentRow++;
  });

  // Understanding Status Codes
  currentRow += 2;
  instructionsSheet.getCell(`B${currentRow}`).value = 'UNDERSTANDING STATUS CODES';
  instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  instructionsSheet.getCell(`B${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6B7280' }
  };
  instructionsSheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  instructionsSheet.getRow(currentRow).height = 25;
  currentRow++;

  const statusCodes = [
    {
      status: 'ACCEPTED',
      description: 'Embedment is greater than or equal to Design Embedment. Pile meets specifications.',
      color: 'FF10B981',
      textColor: 'FFFFFFFF'
    },
    {
      status: 'TOLERANCE',
      description: 'Embedment is within tolerance range (Design Embedment - Tolerance to Design Embedment). May require engineering review.',
      color: 'FFF59E0B',
      textColor: 'FFFFFFFF'
    },
    {
      status: 'REFUSAL',
      description: 'Embedment is below Design Embedment minus Tolerance. Requires immediate attention and likely remediation.',
      color: 'FFEF4444',
      textColor: 'FFFFFFFF'
    },
    {
      status: 'PENDING',
      description: 'No embedment data entered yet. Pile installation not completed or data not recorded.',
      color: 'FF6B7280',
      textColor: 'FFFFFFFF'
    }
  ];

  statusCodes.forEach(code => {
    currentRow++;
    const statusCell = instructionsSheet.getCell(`B${currentRow}`);
    statusCell.value = `${code.status}: ${code.description}`;
    statusCell.font = { bold: true, color: { argb: code.textColor } };
    statusCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: code.color }
    };
    statusCell.alignment = { wrapText: true, indent: 1, vertical: 'middle' };
    instructionsSheet.getRow(currentRow).height = 30;
  });

  // Pro Tips Section
  currentRow += 2;
  instructionsSheet.getCell(`B${currentRow}`).value = 'PRO TIPS & BEST PRACTICES';
  instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  instructionsSheet.getCell(`B${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEA580C' }
  };
  instructionsSheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  instructionsSheet.getRow(currentRow).height = 25;
  currentRow++;

  const proTips = [
    '✓ CUSTOMIZE PILE TYPES in the Configuration sheet (cells B9-B20). All dropdowns, formulas, and the Dashboard will automatically update. This is the easiest way to match your project specifications.',
    '✓ The embedment tolerance is set to 1 ft by default in Configuration sheet (cell C5). Change this value if your project uses a different tolerance. All status calculations will update automatically.',
    '✓ CUSTOM FIELDS: Rename the "Custom Field 1/2/3" column headers in Plot Plan and Field Data Entry to match your CSV files. This makes importing data from different engineering companies much easier.',
    '✓ Don\'t delete or modify the formula columns in Field Data Entry (Drive Time, Status, Design Embedment, Pile Type, Block). These auto-calculate based on your input.',
    '✓ To add more pile types: Go to Configuration sheet → Add new type names in column B below row 13 → They\'ll automatically appear in all dropdowns.',
    '✓ When adding new rows in Field Data Entry, copy the formulas down from the row above to ensure calculations continue working.',
    '✓ The Plot Plan is your source of truth. Make sure pile names match exactly between Plot Plan and Field Data Entry for the VLOOKUP formulas to work.',
    '✓ Use the Dashboard as a printable progress report. Hide gridlines are already off for a clean presentation.',
    '✓ Slow drives are highlighted automatically when drive time exceeds 60 minutes. This threshold is hardcoded but can be modified in the conditional formatting rules.',
    '✓ The spreadsheet works in Excel, Google Sheets, and LibreOffice Calc. Some advanced formatting may vary slightly between applications.',
    '✓ Sample data is included in each sheet. You can delete it and start fresh, or modify it to match your project.',
    '✓ Time entries (Start Time, End Time) can be entered in various formats: "8:00 AM", "08:00", "0800", etc. The drive time formula will handle most formats.',
    '✓ Data validation prevents common errors (Pile Type dropdown, Refusal Yes/No). You can add more validation rules in Data → Data Validation.',
    '✓ To add charts or pivot tables, use Excel\'s built-in tools with the Field Data Entry or Block Analysis sheets as source data.',
    '✓ Back up your file regularly, especially before making major changes like deleting rows or modifying formulas.',
    '✓ The Refusal column (Yes/No) is different from Refusal status. "Refusal: Yes" means the pile hit refusal during driving. Status "Refusal" means embedment is below tolerance.',
    '✓ If you reorganize columns, update the VLOOKUP formulas accordingly. The current formulas reference specific column numbers.'
  ];

  proTips.forEach(tip => {
    currentRow++;
    instructionsSheet.getCell(`B${currentRow}`).value = tip;
    instructionsSheet.getCell(`B${currentRow}`).alignment = { wrapText: true, indent: 1 };
    instructionsSheet.getRow(currentRow).height = 35;

    // Alternating background colors
    if (proTips.indexOf(tip) % 2 === 0) {
      instructionsSheet.getCell(`B${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
    }
  });

  // Key Formulas Section
  currentRow += 2;
  instructionsSheet.getCell(`B${currentRow}`).value = 'KEY FORMULAS EXPLAINED';
  instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  instructionsSheet.getCell(`B${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0891B2' }
  };
  instructionsSheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  instructionsSheet.getRow(currentRow).height = 25;
  currentRow++;

  const formulas = [
    {
      name: 'Drive Time Calculation',
      formula: '=((TIMEVALUE(End Time)-TIMEVALUE(Start Time))*24*60)',
      explanation: 'Converts time difference to minutes. Multiplies by 24 (hours) then 60 (minutes).'
    },
    {
      name: 'Status Calculation',
      formula: '=IF(Embedment="","Pending",IF(Embedment>=Design,"Accepted",IF(Embedment>=(Design-Tolerance),"Tolerance","Refusal")))',
      explanation: 'Nested IF statement that compares actual embedment against design embedment and tolerance to determine status.'
    },
    {
      name: 'Design Embedment Lookup',
      formula: '=IFERROR(VLOOKUP(PileName,PlotPlan!A:D,4,FALSE),"")',
      explanation: 'Looks up the pile name in Plot Plan and returns the design embedment (column 4). IFERROR handles missing piles gracefully.'
    },
    {
      name: 'Percentage Complete',
      formula: '=IF(Total>0,(Total-Pending)/Total,0)',
      explanation: 'Calculates completion rate by subtracting pending piles from total, then dividing by total.'
    }
  ];

  formulas.forEach(formulaInfo => {
    currentRow++;
    instructionsSheet.getCell(`B${currentRow}`).value = `${formulaInfo.name}:`;
    instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 11, color: { argb: 'FF0891B2' } };
    instructionsSheet.getRow(currentRow).height = 20;
    currentRow++;

    instructionsSheet.getCell(`B${currentRow}`).value = formulaInfo.formula;
    instructionsSheet.getCell(`B${currentRow}`).font = { name: 'Courier New', size: 10, color: { argb: 'FF374151' } };
    instructionsSheet.getCell(`B${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };
    instructionsSheet.getCell(`B${currentRow}`).alignment = { wrapText: true, indent: 2 };
    instructionsSheet.getRow(currentRow).height = 25;
    currentRow++;

    instructionsSheet.getCell(`B${currentRow}`).value = formulaInfo.explanation;
    instructionsSheet.getCell(`B${currentRow}`).alignment = { wrapText: true, indent: 2 };
    instructionsSheet.getRow(currentRow).height = 30;
    currentRow++;
  });

  // Troubleshooting Section
  currentRow += 2;
  instructionsSheet.getCell(`B${currentRow}`).value = 'TROUBLESHOOTING';
  instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  instructionsSheet.getCell(`B${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEF4444' }
  };
  instructionsSheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  instructionsSheet.getRow(currentRow).height = 25;
  currentRow++;

  const troubleshooting = [
    {
      problem: 'VLOOKUP returns blank or #N/A error',
      solution: 'Make sure the pile name in Field Data Entry exactly matches the pile name in Plot Plan (case-sensitive, no extra spaces).'
    },
    {
      problem: 'Drive Time shows strange numbers or errors',
      solution: 'Ensure start and end times are formatted as times, not text. Use format like "8:00 AM" or "14:30".'
    },
    {
      problem: 'Status not updating correctly',
      solution: 'Check that embedment and design embedment are numeric values (not text). Also verify tolerance setting in Dashboard C5.'
    },
    {
      problem: 'Conditional formatting not showing colors',
      solution: 'The formatting rules may have been cleared. Check Data → Conditional Formatting to restore them.'
    },
    {
      problem: 'New rows don\'t have formulas',
      solution: 'Copy formulas from the row above, or select the cell with the formula and drag the fill handle down.'
    }
  ];

  troubleshooting.forEach(item => {
    currentRow++;
    instructionsSheet.getCell(`B${currentRow}`).value = `Problem: ${item.problem}`;
    instructionsSheet.getCell(`B${currentRow}`).font = { bold: true, color: { argb: 'FFDC2626' } };
    instructionsSheet.getCell(`B${currentRow}`).alignment = { wrapText: true, indent: 1 };
    instructionsSheet.getRow(currentRow).height = 25;
    currentRow++;

    instructionsSheet.getCell(`B${currentRow}`).value = `Solution: ${item.solution}`;
    instructionsSheet.getCell(`B${currentRow}`).alignment = { wrapText: true, indent: 2 };
    instructionsSheet.getCell(`B${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF2F2' }
    };
    instructionsSheet.getRow(currentRow).height = 30;
    currentRow++;
  });

  // Footer
  currentRow += 2;
  instructionsSheet.getCell(`B${currentRow}`).value = '© 2025 PileTrackerPro - Excel Template Version';
  instructionsSheet.getCell(`B${currentRow}`).font = { italic: true, size: 10, color: { argb: 'FF9CA3AF' } };
  instructionsSheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center' };

  // ============================================
  // SAVE WORKBOOK
  // ============================================
  const filename = 'PileTrackerPro_Template.xlsx';
  await workbook.xlsx.writeFile(filename);

  console.log(`\n✅ Excel spreadsheet created successfully: ${filename}`);
  console.log(`\n📊 Features included:`);
  console.log(`   ✓ Plot Plan sheet with data validation`);
  console.log(`   ✓ Field Data Entry with auto-calculations and conditional formatting`);
  console.log(`   ✓ Dashboard with real-time statistics`);
  console.log(`   ✓ Block Analysis with performance metrics`);
  console.log(`   ✓ Instructions sheet with complete user guide, pro tips, and troubleshooting`);
  console.log(`   ✓ Automatic VLOOKUP formulas`);
  console.log(`   ✓ Status color coding (Accepted/Tolerance/Refusal/Pending)`);
  console.log(`   ✓ Drive time calculations`);
  console.log(`   ✓ Beautiful formatting and professional design`);
  console.log(`\n🎯 Ready to use! Open the file in Excel or Google Sheets.\n`);
}

// Run the script
createPileTrackerExcel().catch(console.error);
