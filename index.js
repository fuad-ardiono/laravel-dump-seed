// depedency
import {seedFile} from "./module/PhpModule";

const mysql = require('mysql2/promise');
const Promise = require('bluebird');
const fs = require('fs');
const _ = require('lodash');
const rimraf = require('rimraf');

// module
const PhpModule = require('./module/PhpModule');

// argument
const language = process.argv.slice(2)[0];
const database = process.argv.slice(3)[0];
const host = process.argv.slice(4)[0];
const port = process.argv.slice(5)[0];
const user = process.argv.slice(6)[0];
const password = process.argv.slice(7)[0];


async function main() {
  rimraf.sync('./extracted');
  checkDirectory();
  const connection = await mysql.createConnection({
    host,
    user,
    password,
    database,
    port,
    Promise
  });

  try {
    const tableListData = [];
    const columnsSchemasPromises = [];
    const dataSchemasPromises = [];

    const tableList = await connection.execute('SHOW TABLES');
    tableList[0].map((obj) => {
      tableListData.push(obj[`Tables_in_${database}`]);

      // push column schema promise to array
      const column = connection.execute(`DESCRIBE ${obj[`Tables_in_${database}`]}`);
      columnsSchemasPromises.push(column);

      const data = connection.execute('SELECT * FROM ' + obj[`Tables_in_${database}`]);
      dataSchemasPromises.push(data);
    });

    // extract schema and make test
    await extractSchemaAndMakeTest(columnsSchemasPromises, tableListData);

    // extract data and make seed file
    await extractDataAndMakeSeed(dataSchemasPromises, tableListData);

  } catch (err) {
    console.log(err);
  } finally {
    connection.close();
  }
}

// Notes : Extend language in compile function !!
function compileSchemaAndTestFile(extractedData) {
  if (language === 'lang=php') {
    return {
      SchemaFile: PhpModule.schemaFile(extractedData),
      SchemaFileNameWithExtension: extractedData.schemaFileName + '.php',
      TestFile: PhpModule.testFile(extractedData),
      TestFileNameWithExtension: extractedData.testFileName + '.php',
    }
  }
}

function compileColumn(columnDetail) {
  if (language === 'lang=php') {
    return PhpModule.pushColumns(columnDetail);
  }
}

function compileAllTableFile(tableColumnList) {
  if (language === 'lang=php') {
    return PhpModule.allTableFile(tableColumnList);
  }
}

function checkDirectory() {
  if (!fs.existsSync('./extracted')){
    fs.mkdirSync('./extracted');
    if(!fs.existsSync('./extracted/test')) {
      fs.mkdirSync('./extracted/test');
    }

    if(!fs.existsSync('./extracted/schema')) {
      fs.mkdirSync('./extracted/schema');
    }

    if(!fs.existsSync('./extracted/seeder')) {
      fs.mkdirSync('./extracted/seeder');
    }
  }
}

async function extractSchemaAndMakeTest(columnsSchemasPromises, tableListData) {
  try {
    const columnsSchemas = await Promise.all(columnsSchemasPromises);
    columnsSchemas.map((obj, index) => {
      const columnsSchema = [];
      const extractedData = {};
      const titleCaseTableName = _.startCase(tableListData[index]).split(' ');
      extractedData.tableName = tableListData[index];
      extractedData.schemaFileName = _.join(titleCaseTableName, '') + 'Schema';
      extractedData.testFileName = _.join(titleCaseTableName, '') + 'TableTest';

      obj[0].map((col) => {
        const columnDetail = {};
        columnDetail.name = col['Field'];
        columnDetail.type = col['Type'];
        columnsSchema.push(compileColumn(columnDetail));
      });
      extractedData.columnsSchema = columnsSchema;
      const SchemaAndTest = compileSchemaAndTestFile(extractedData);

      fs.writeFile(`./extracted/schema/${SchemaAndTest.SchemaFileNameWithExtension}`, SchemaAndTest.SchemaFile, function (err) {
        if (err) {
          return console.log(err);
        }
        // console.log(`File ${SchemaAndTest.SchemaFileNameWithExtension} was saved!`);
      });

      fs.writeFile(`./extracted/test/${SchemaAndTest.TestFileNameWithExtension}`, SchemaAndTest.TestFile, function (err) {
        if (err) {
          return console.log(err);
        }
        // console.log(`File ${SchemaAndTest.TestFileNameWithExtension} was saved!`);
      });
    });

    const AllTable = compileAllTableFile(tableListData);
    fs.writeFile(`./extracted/schema/AllTable.php`, AllTable, function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("File AllTableName.php was saved!");
    });
  } catch (e) {
    throw new Error(e);
  }
}

function compileRecord(record) {
  if (language === 'lang=php') {
    return PhpModule.pushRecord(record);
  }
}

function compileSeedFile(extractedData) {
  if (language === 'lang=php') {
    return {
      SeedFile: PhpModule.seedFile(extractedData),
      SeedFileNameWithExtension: extractedData.seedFileName + '.php',
    }
  }
}

async function extractDataAndMakeSeed(dataSchemasPromises, tableListData) {
 try {
   const dataSchemas = await Promise.all(dataSchemasPromises);
   dataSchemas.map((schema, index) => {
     if(schema[0].length > 0) {
       const extractedData = {};
       const titleCaseTableName = _.startCase(tableListData[index]).split(' ');
       extractedData.tableName = tableListData[index];
       extractedData.seedFileName = _.join(titleCaseTableName, '') + 'Seeder';

       // console.log(`The table name ${tableListData[index]}`);
       // console.log(schema[0].length);
       // console.log(Object.keys(schema[0][0]));

       const records = [];
       schema[0].map((record) => {
         records.push(`[${compileRecord(record)}]`);
       });
       extractedData.records = records;

       // write seed file, pass records data
       const Seeder = compileSeedFile(extractedData);

       fs.writeFile(`./extracted/seeder/${Seeder.SeedFileNameWithExtension}`, Seeder.SeedFile, function (err) {
         if(err) {
           console.log(err);
         }

         console.log(`File ${Seeder.SeedFileNameWithExtension} was saved !`);
       })

     }
   })
 } catch (e) {
   console.log(e);
 }
}

main();
