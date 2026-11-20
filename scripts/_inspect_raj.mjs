import ExcelJS from "exceljs";
const wb=new ExcelJS.Workbook();
await wb.xlsx.readFile("/Users/sandeepnayak/Desktop/All Landscape report/Rajnagar Thematic Investments (1).xlsx");
wb.eachSheet(ws=>{
 console.log("=== SHEET:",ws.name,"rows:",ws.rowCount,"cols:",ws.columnCount);
 for(let r=1;r<=Math.min(3,ws.rowCount);r++){
   const vals=[];
   ws.getRow(r).eachCell({includeEmpty:false},(c,cn)=>{const v=c.text; vals.push(cn+":"+(""+v).slice(0,24));});
   console.log("R"+r, vals.join(" | ").slice(0,700));
 }
});
