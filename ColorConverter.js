const fs = require('fs');
const rgxPatternColor = new RegExp("set_color_profile_slot\\(\\d+,\\d+,\\d+,\\d+,\\d+\\);", "i")
const rgxPatternInit = new RegExp("set_num_palettes\\(\\d+\\);", "i")
const rgxPatternRange = new RegExp("set_color_profile_slot_range\\(\\d+,\\d+,\\d+,\\d+\\);", "i")
const rgxPatternEmpty = new RegExp("\\s", "g")
const rgxPatternNumbers = new RegExp("[^\\d]", "g")


function skinNameByID(integer){
  let names = ["Default", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eigth", "Ninth"];
  if (integer < 10) return names[integer];
  return integer.toString();
}

function toHex(integer){
  let str = Number(integer).toString(16).toUpperCase();
  return str.length == 1 ? "0" + str : str;
}

function parser(input) { //returns object


  let skinNum = 0; //Number of skins the character has
  let regionNum = 0; //Number of different tracked colors the character has
  let initialMatrix = []; //stores colors in the first parse - initialMatrix[i] = (skin, slot, R,G,B)
  let trueSkinsMatrix = []; //Stores the final colors for skins - trueSkinsMatrix[skin][slot] = (R,G,B)
  let initialRanges = []; //stores ranges in the first parse - initialRanges[i] = (slot, H, S, V)
  let colorRangeMat = []; //stores the final color ranges - colorRangeMat[slot] = (H,S,V)
  let codes = []; //stores each skin's code - codes[skin] = skin code string, eg: "0123-4567-89AB"


  let splitInput = input.split("\n");
  splitInput.forEach((item, i) => { //remove comments and spaces
    splitInput[i] = item.split("//")[0].replace(rgxPatternEmpty, "");
  });


  splitInput.forEach((item, i) => {
    if (rgxPatternColor.test(item)){ //Reads colors slots
      const values = item.split(rgxPatternNumbers).filter(a => a);
      values.forEach((itemb, j) => {
        values[j] = parseInt(itemb);
      });
      initialMatrix.push(values);
    }

    else if (rgxPatternInit.test(item)){ //Reads number of skins
      skinNum = item.split(rgxPatternNumbers).filter(a => a)[0];
    }

    else if(rgxPatternRange.test(item)){ //Reads up color ranges
      const values = item.split(rgxPatternNumbers).filter(a => a);
      values.forEach((itemb, j) => {
        values[j] = parseInt(itemb);
      });
      initialRanges.push(values);
    }
  });

  //set number of color regions
  initialMatrix.forEach((item, i) => {
    if (item[1] >= regionNum) regionNum = item[1]+1;
  });

  //Sets color range
  colorRangeMat = new Array(parseInt(regionNum));
  initialRanges.forEach((item, i) => {
    colorRangeMat[item[0]] = new Array(item[1]%256, item[2]%256, item[3]%256);
  });

  //initialize final matrix of skins
  trueSkinsMatrix = new Array(parseInt(skinNum));
  for (let i = 0; i < skinNum; ++i){
    trueSkinsMatrix[i] = new Array(parseInt(regionNum));
  }
  initialMatrix.forEach((item, i) => {
    trueSkinsMatrix[item[0]][item[1]] = new Array(item[2]%256, item[3]%256, item[4]%256)
  });

  //Create code for each skin
  codes = new Array(parseInt(skinNum));
  trueSkinsMatrix.forEach((item, i) => {
    let newCode = "";
    let lettercounter = 0;
    item.forEach((itemb, j) => {
      itemb.forEach((itemc, k) => {
        newCode += toHex(itemc);
        ++lettercounter;
        if (lettercounter%2 == 0){
          newCode += "-";
        }
      });
    });

    //TO DO: CHECKSUM - Not needed for Stream tool
    newCode += "00";
    ++lettercounter;

    if (lettercounter%2 == 1){
      newCode += "00";
    }
    codes[i] = newCode;
  });

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
  fs.readFile("colors.gml", 'utf8', function(err, data) {
    if (err) throw err;

    let result = parser(data);

    fs.writeFile("_info.json", JSON.stringify(result, null, 4), function(err) {
      if (err) console.log(err)
    })

  });
}
