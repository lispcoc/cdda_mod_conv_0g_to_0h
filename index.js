const fs = require('fs');
const { isObject } = require('util');
const execSync = require('child_process').execSync


const listFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(dirent =>
    dirent.isFile() ? [`${dir}/${dirent.name}`] : listFiles(`${dir}/${dirent.name}`)
)

const createFile = (data, filename) => {
    const filePath = filename;
  
    fs.writeFile(filePath, data, (err) => {
      // ディレクトリ作成できなかったとき
      if (err && err.code === "ENOENT") {
        // ディレクトリ部分だけ切り取り
        const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  
        // 親ディレクトリ作成
        fs.mkdir(dir, { recursive: true }, (err) => {
          if (err) throw err;
          createFile(data, filename);
        });
        return;
      }
    });
  };
  
const processValueNameChange = ((obj, key) => {
    var change = false
    const translate = [
        ["value", "ATTACK_COST", "ATTACK_SPEED"]
    ]
    translate.forEach(t => {
        if (key == t[0] && obj[key] == t[1]) {
            obj[key] = t[2]
            console.log("[Change]" + t[1] + " => " + t[2])
            change = true
        }
    })
    return change
})

const replaceKey = ((obj, translate) => {
    var change = false
    translate.forEach(t => {
        if (obj.hasOwnProperty(t[0])) {
            if (t[1] != "") {
                obj[t[1]] = obj[t[0]]
            }
            delete obj[t[0]]
            console.log("[Change]" + t[0] + " => " + t[1])
            change = true
        }
    })
    return change = true
})

const processKeyNameChange = ((obj, key) => {
    var change = false
    const translate = [
        ["fail_multiplier", "skill_penalty"],
        ["default_fail_multiplier", "default_skill_penalty"],
        ["ups_charges_multiplier", "ammo_to_fire_multiplier"],
        ["standard_symbols", ""],
        ["wheel_type", ""]
    ]
    replaceKey(obj, translate)
    return change
})

const processDamageFormatChange = ((obj) => {
})

const processUpsCharges = ((obj) => {
    if (obj.hasOwnProperty("ups_charges")) {
        // 旧表記の1 = 1 kJ
        obj["energy_drain"] = obj["ups_charges"] + " kJ"
        delete obj["ups_charges"]
        if (obj["copy-from"]) {
            if (obj["extend"] && obj["extend"]["flags"]) {
                if (obj["extend"].hasOwnProperty("flags")) {
                    obj["extend"]["flags"].push("USE_UPS")
                } else {
                    obj["extend"]["flags"] =  [ "USE_UPS" ]
                }
            } else {
                obj["extend"] = { "flags": [ "USE_UPS" ] }
            }
        } else {
            if (obj.hasOwnProperty("flags")) {
                obj["flags"].push("USE_UPS")
            } else {
                obj["flags"] = [ "USE_UPS" ]
            }
        }
        console.log("[Change]ups_charges => energy_drain")
    }
})

const processResistFormatChange = ((obj) => {
    var change = false
    const table = [
        ["bash_resist", "bash"],
        ["cut_resist", "cut"],
        ["acid_resist", "acid"],
        ["fire_resist", "heat"],
        ["bullet_resist", "bullet"],
        ["elec_resist", "electric"]
    ]
    var resist = {};
    table.forEach(t => {
        if (obj[t[0]] != null) {
            resist[t[1]] = obj[t[0]]
            delete obj[t[0]]
            change = true
        }
    })
    if (obj.hasOwnProperty("resist") && change) {
        obj["resist"] = resist
        console.log("[Change]resist")
    }
})

const processObsoleteFlag = ((obj) => {
    var change = false
    const table = [
        "STAB",
        "UNARMED_WEAPON"
    ]
    var resist = {};
    if (obj.hasOwnProperty("flags")) {
        const old_len = obj["flags"].length
        obj["flags"] = obj["flags"].filter(f => !table.find(f2 => f2 == f))
        const new_len = obj["flags"].length
        if (new_len != old_len) {
            console.log("[Change]Obsolete Flag")
        }
    }
})

const processObject = (obj => {
    if(Array.isArray(obj)) {
        obj.forEach(nest_obj => {
            processObject(nest_obj)
        })
    } else {
        for(const key in obj) {
            if (isObject(obj[key])) {
                processObject(obj[key])
            } else {
                processValueNameChange(obj, key)
            }
        }
        processKeyNameChange(obj)
        processDamageFormatChange(obj)
        processResistFormatChange(obj)
        processObsoleteFlag(obj)
        processUpsCharges(obj)
    }
})


const in_dir = './input/'
const out_dir = './output/'

listFiles(in_dir).filter(e => e.match(/.json$/)).forEach(file => {
    const old = fs.readFileSync(file, encoding = "utf8")
    var json = JSON.parse(old);
    var old_standard = JSON.stringify(json)
    console.log(file)
    processObject(json)
    var new_standard = JSON.stringify(json)
    var new_file = file.replace(in_dir, out_dir)
    if (new_standard != old_standard) {
        fs.writeFileSync("temp.json", JSON.stringify(json))
        const new_txt = execSync('json_formatter.exe < temp.json')
        createFile(new_txt, new_file)
    } else {
        createFile(old, new_file)
    }
})

