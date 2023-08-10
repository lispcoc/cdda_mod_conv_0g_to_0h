const fs = require('fs');
const { isObject } = require('util');
const { isNumberObject } = require('util/types');
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
        ["req_buffs", "required_buffs_all"],
        ["wheel_type", ""]
    ]
    replaceKey(obj, translate)
    return change
})

const processMeleeDamageFormatChange = ((obj) => {
    var change = false
    const table = [
        ["bashing", "bash"],
        ["cutting", "cut"]
    ]
    var melee_damage = {};
    table.forEach(t => {
        if (obj[t[0]] != null) {
            melee_damage[t[1]] = obj[t[0]]
            delete obj[t[0]]
            change = true
        }
    })
    if (change) {
        obj["melee_damage"] = melee_damage
        console.log("[Change]melee_damage")
    }
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

const processTechniques = ((obj) => {
    if(obj.hasOwnProperty("min_melee")) {
        obj["skill_requirements"] = [{ "name": "melee", "level": obj["min_melee"] }]
        delete obj["min_melee"]
        console.log("[Change]min_melee")
    }
})

const processModInfo = ((obj) => {
    delete obj["mod-type"]
})

const processNamePlural = ((obj) => {
    if(obj.hasOwnProperty("name_plural")) {
        if(isObject(obj["name"])) {
            obj["name"]["str_pl"] = obj["name_plural"]
        } else {
            obj["name"] = {str: obj["name"], str_pl: obj["name_plural"]}
        }
        delete obj["name_plural"]
        console.log("[Change]name_plural")
    }
})

const processRecipe = ((obj) => {
    if(obj["type"] == "recipe") {
        if(!isNaN(obj["time"])) {
            obj["time"] = obj["time"] + " s"
            console.log("[Change]time")
        }
    }
})

const processArtifactData = ((obj) => {
    var relic_data = {passive_effects: []}
    if(obj.hasOwnProperty("artifact_data")) {
        if(obj["artifact_data"].hasOwnProperty("effects_wielded")) {
            for(var a of obj["artifact_data"]["effects_wielded"]) {
                relic_data.passive_effects.push({ id: a})
            }
        }
        delete obj["artifact_data"]
        obj["relic_data"] = relic_data
        console.log("[Change]artifact_data")
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
        processNamePlural(obj)
        processKeyNameChange(obj)
        processMeleeDamageFormatChange(obj)
        processResistFormatChange(obj)
        processObsoleteFlag(obj)
        processUpsCharges(obj)
        processTechniques(obj)
        processModInfo(obj)
        processRecipe(obj)
        processArtifactData(obj)
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

