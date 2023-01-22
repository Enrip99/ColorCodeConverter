const fs = require('fs');
const rgxPatternColor = new RegExp("set_color_profile_slot\\(\\d+,\\d+,\\d+,\\d+,\\d+\\);", "i") //Matches set_color_profile_slot function
const rgxPatternInit = new RegExp("set_num_palettes\\(\\d+\\);", "i") //Matches set_num_palettes function
const rgxPatternRange = new RegExp("set_color_profile_slot_range\\(\\d+,\\d+,\\d+,\\d+\\);", "i") //Matches set_color_profile_slot_range function
const rgxPatternEmpty = new RegExp("\\s", "g") //Matches all whitespace characters
const rgxPatternNumbers = new RegExp("[^\\d]", "g") //Matches all non-digit characters
const RE_BLOCKS = new RegExp([
    /\/(\*)[^*]*\*+(?:[^*\/][^*]*\*+)*\//.source,           // $1: multi-line comment
    /\/(\/)[^\n]*$/.source,                                 // $2 single-line comment
    /"(?:[^"\\]*|\\[\S\s])*"|'(?:[^'\\]*|\\[\S\s])*'/.source, // string, don't care about embedded eols
    /(?:[$\w\)\]]|\+\+|--)\s*\/(?![*\/])/.source,           // division operator
    /\/(?=[^*\/])[^[/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[/\\]*)*?\/[gim]*/.source
    ].join('|'),                                            // regex
    'gm'  // note: global+multiline with replace() need test
    );

function skinNameByID(integer){ //returns ordinal as text for 0-9. Returns number itself+1 as text if higher
  let names = ["Default", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eigth", "Ninth", "Tenth"];
  if (integer < names.length && integer >= 0) return names[integer];
  return (integer+1).toString();
}

function toHex(integer){ //converts number to its hexadecimal representation as an upper-case string
  let str = Number(integer).toString(16).toUpperCase();
  return str.length == 1 ? "0" + str : str;
}

function min(a, b){ //returns minimum out of two inputs
  return a < b ? a : b;
}

function max(a, b){ //returns maximum out of two unputs
  return a > b ? a : b;
}

function cap(a){  //caps a number between 0 and 255
  return max(min(a, 255),0);
}

function stripComments(str) { //removes comments from colors file
    return str.replace(RE_BLOCKS, function (match, mlc, slc) {
        return mlc ? ' ' :     // multiline comment (must be replaced with one space)
               slc ? '' :      // single-line comment
               match;          // divisor, regex, or string, return as-is
        });
}


//input: string -   contains the whole code of colors.gml
//force: boolean -  if true, won't return prematurely if errors are encountered
//returns: object - returns object containing skin names and their color codes; the original color; the color ranges; and the three different layout positions and scales
//                  {skinList:{name:string,hex:string}[], ogColor:int[], colorRange:int[], scoreboard:{neutral:{x:num,y:num,scale:num}}, vsScreen:{neutral:{x:num,y:num,scale:num}}, gui:{neutral:{x:num,y:num,scale:num}}}
function parser(input, force) {

  let skinNum = 0; //Number of skins the character has
  let regionNum = 0; //Number of different tracked colors the character has
  let initialMatrix = []; //Stores colors in the first parse - initialMatrix[i] = (skin, slot, R,G,B)
  let trueSkinsMatrix = []; //Stores the final colors for skins - trueSkinsMatrix[skin][slot] = (R,G,B)
  let initialRanges = []; //Stores ranges in the first parse - initialRanges[i] = (slot, H, S, V)
  let colorRangeMat = []; //Stores the final color ranges - colorRangeMat[slot] = (H,S,V)
  let codes = []; //Stores each skin's code - codes[skin] = skin code string, eg: "0123-4567-89AB"
  let errors = []; //Stores all encountered errors as plain text

  let splitInput = stripComments(input).split("\n"); //removes comments
  splitInput.forEach((item, i) => { //remove spaces
    splitInput[i] = item.replace(rgxPatternEmpty, "");
  });

  //Scan through all lines of code, store them in temporary values
  splitInput.forEach((item, i) => {
    if (rgxPatternColor.test(item)){ //Reads colors slots
      const values = item.split(rgxPatternNumbers).filter(a => a); //retains only numbers, to grab function values
      values.forEach((itemb, j) => {
        values[j] = parseInt(itemb);
      });
      initialMatrix.push(values);
    }

    else if (rgxPatternInit.test(item)){ //Reads number of skins
      skinNum = item.split(rgxPatternNumbers).filter(a => a)[0]; //retains only numbers, to grab function value
    }

    else if(rgxPatternRange.test(item)){ //Reads up color ranges
      const values = item.split(rgxPatternNumbers).filter(a => a); //retains only numbers, to grab function values
      values.forEach((itemb, j) => {
        values[j] = parseInt(itemb);
      });
      initialRanges.push(values);
    }
  });

  //set number of color regions
  initialRanges.forEach((item, i) => {
    if (item[0] >= regionNum) regionNum = item[0]+1;
  });

  //Sets color range
  colorRangeMat = new Array(parseInt(regionNum));
  initialRanges.forEach((item, i) => {
    colorRangeMat[item[0]] = new Array(cap(item[1]), cap(item[2]), cap(item[3]));
  });

  //initialize final matrix of skins
  trueSkinsMatrix = new Array(parseInt(skinNum));
  for (let i = 0; i < skinNum; ++i){
    trueSkinsMatrix[i] = new Array(parseInt(regionNum));
  }
  initialMatrix.forEach((item, i) => { //adds values to matrix after checking validity of access
    if (item[0] >= skinNum && item[1] >= regionNum) errors.push("Attempting to add non-existant color slot " + item[1] + " to non-existant skin " + item[0]);
    else if (item[0] >= skinNum) errors.push("Attempting to add color slot " + item[1] + " to non-existant skin " + item[0]);
    else if (item[1] >= regionNum) errors.push("Attempting to add non-existant color slot " + item[1] + " to skin " + item[0]);
    else trueSkinsMatrix[item[0]][item[1]] = new Array(cap(item[2]), cap(item[3]), cap(item[4]))
  });

  //Create code for each skin
  codes = new Array(parseInt(skinNum));
  trueSkinsMatrix.forEach((item, i) => {
    let newCode = "";
    let lettercounter = 0;
    let checksum = 0;
    item.forEach((itemb, j) => {
      itemb.forEach((itemc, k) => {
        newCode += toHex(itemc);
        ++lettercounter;
        if (lettercounter%2 == 0){
          newCode += "-";
        }
        checksum += (101 + k + j)*itemc;
      });
    });
    newCode += toHex(checksum%256);
    ++lettercounter;

    if (lettercounter%2 == 1){
      newCode += "00";
    }
    codes[i] = newCode;
  });

  //ERROR DETECTION
  //check if some slots have been skipped
  for (let i = 0; i < regionNum; ++i){
    if (colorRangeMat[i] === undefined || colorRangeMat[i].length == 0){
      errors.push("Missing color slot: " + i);
    }
  }
  //check if any color for any slot is missing
  trueSkinsMatrix.forEach((item, i) => {
    for (let j = 0; j < regionNum; ++j){
      if (item[j] === undefined || item[j].length == 0){
        errors.push("Missing color for skin " + i + " slot " + j);
      }
    }
  });
  if (errors.length != 0){  //Returns prematurely if any errors have been encountered so far
    errors.unshift("The following " + errors.length + " errors have been found:");
    if (!force) return errors;
    else console.log(errors);
  }

  //Export to Json
  //skinList
  let skinListArr = [];
  codes.forEach((item, i) => {
    let nameandcode = {
      name: skinNameByID(i),
      hex: item
    }
    skinListArr.push(nameandcode);
  });

  //ogColor
  let ogColArr = [];
  trueSkinsMatrix[0].forEach((item, i) => {
    ogColArr.push(item[0]);
    ogColArr.push(item[1]);
    ogColArr.push(item[2]);
    ogColArr.push(1);
  });

  //colorRange
  let colorRangeArr = [];
  colorRangeMat.forEach((item, i) => {
    colorRangeArr.push(item[0]);
    colorRangeArr.push(item[1]);
    colorRangeArr.push(item[2]);
    colorRangeArr.push(1);
  });

  //scoreboard, vsScreen & gui
  let uiPos = {
    x: 0,
    y: 0,
    scale: 1
  }
  let uiElement = {
    neutral: uiPos
  }

  let finalObj = {
    skinList: skinListArr,
    ogColor: ogColArr,
    colorRange: colorRangeArr,
    scoreboard: uiElement,
    vsScreen: uiElement,
    gui: uiElement
  }
  return finalObj;
}

if (require.main === module) {
  let inputFile = "colors.gml";
  let force = false;


  if (process.argv.length == 3){
    if (process.argv[2] === "-f"){
      force = true;
    }
    else{
      inputFile = process.argv[2];
    }
  }

  else if(process.argv.length == 4){
    if (process.argv[2] === "-f"){
      force = true;
    }
    else {
      console.log("Invalid argument");
      return;
    }
    inputFile = process.argv[3];
  }


  fs.readFile(inputFile, 'utf8', function(err, data) {
    if (err) throw err;

    let result = parser(data, force);

    if (Array.isArray(result)){ //Function has returned errors
      console.log(result)
    }
    else{ //Function has returned successfully
      fs.writeFile("_info.json", JSON.stringify(result, null, 4), function(err) {
        if (err) console.log(err)
      })
    }

  });
}
