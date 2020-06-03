const moment = require('moment');

export const pushColumns = (columnDetail) => {
  return `["name" => "${columnDetail.name}",
"type" => "${columnDetail.type}"]`;
};

export const schemaFile = (extractedData) => {
  return  `<?php
namespace Tests\\Integration\\Table\\Schema;

class ${extractedData.schemaFileName} {
\tpublic $column = [${extractedData.columnsSchema}];

\tpublic function countColumn() {
\t\treturn count($this->column);
\t}
}`;
};

export const testFile = (extractedData) => {
  return `<?php
use Illuminate\\Support\\Facades\\Schema;
use Tests\\Integration\\Table\\Schema\\${extractedData.schemaFileName};
use Illuminate\\Support\\Facades\\DB;

class ${extractedData.testFileName} extends TestCase {
\tpublic $schema;

\tpublic function __construct($name = null, array $data = [], $dataName = '')
\t{
\t\t$this->schema = new ${extractedData.schemaFileName}();
\t\tparent::__construct($name, $data, $dataName);
\t}

\tpublic function testColumnCount()
\t{
\t\t$table_columns = Schema::connection('testing')->getColumnListing('${extractedData.tableName}');

\t\t$this->assertEquals($this->schema->countColumn(), count($table_columns));
\t}

\tpublic function testColumnName()
\t{
\t\t$table_columns = DB::connection('testing')->select('DESCRIBE ${extractedData.tableName}');

\t\t$iteration = 0;
\t\tforeach ($table_columns as $table_column) {
\t\t\t$this->assertEquals($this->schema->column[$iteration]['name'], $table_column->Field);
\t\t\t$iteration++;
\t\t}
\t}

\tpublic function testColumnDataType()
\t{
\t\t$table_columns_types = DB::connection('testing')->select('DESCRIBE ${extractedData.tableName}');

\t\t$iteration = 0;
\t\tforeach ($table_columns_types as $table_column_type) {
\t\t\t$this->assertEquals($this->schema->column[$iteration]['type'], $table_column_type->Type);
\t\t\t$iteration++;
\t\t}
\t}
}`;
};

export const allTableFile = (tableListData) => {
  return `<?php

class AllTable {
	public $tableName = ${JSON.stringify(tableListData)};
	
	public function countTotalTable() {
		return count($this->tableName);
	}
}
`;
};

function guessDataType(data) {
  if (typeof data === 'string') {
    try {
      if (/^[\],:{}\s]*$/.test(data.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
        return `'${data}'`;
      } else  {
        return `'${data}'`;
      }
    } catch (e) {
      console.log(e);
    }
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (typeof data === 'object') {
    if(data !== null) {
      return `'${moment(data).format('YYYY-MM-DD HH:mm:ss')}'`;
    }

    return data;
  }
}

export const pushRecord = (record) => {
  let recordPhpObj = [];
  Object.keys(record).map((key) => {
    const recordStr = [];
    recordStr.push(`'${key}'`);
    recordStr.push(`${guessDataType(record[key])}`);
    recordPhpObj.push(recordStr.join(" => "));
  });

  return recordPhpObj;
};

export const seedFile = (extractedData) => {
  return `<?php

use Illuminate\\Database\\Seeder;

class ${extractedData.seedFileName} extends Seeder
{

\tpublic function run()
\t{
\t\t$dataExist = \\DB::table('${extractedData.tableName}')->first();

\t\tif(!$dataExist){
\t\t\t\\DB::table('${extractedData.tableName}')->delete();
\t\t\t\\DB::table('${extractedData.tableName}')->insert([${extractedData.records}]);
\t\t}
\t}
}`;
};
