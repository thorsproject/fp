// ------------------ LFZ / CALL SIGN ------------------
function getLFZ() {
  return JSON.parse(localStorage.getItem("lfzData") ||
    JSON.stringify([
      {name:"D-GBRE", cs:"GAF513"},
      {name:"D-GFRA", cs:"GAF514"},
      {name:"D-GGYR", cs:"GAF512"},
      {name:"D-GMUC", cs:"GAF515"},
      {name:"D-GPHX", cs:"GAF516"},
      {name:"D-GRLG", cs:"GAF517"},
      {name:"D-GVIE", cs:"GAF510"},
      {name:"D-GVRB", cs:"GAF518"},
      {name:"D-GZAD", cs:"GAF511"},
      {name:"D-GZRH", cs:"GAF519"},
      {name:"D-3A120", cs:"GAF512"},
      {name:"D-3A121", cs:"GAF512"},
      {name:"D-3A146", cs:"GAF512"}
    ])
  );
}

function getTAC() {
  return JSON.parse(localStorage.getItem("tacData") ||
    JSON.stringify(["CARCL","MADCT","PLSTC"])
  );
}

export function initLFZ() {

  const lfzSelect = document.getElementById("lfzSelect");
  const tacSelect = document.getElementById("tacSelect");
  const callSignDisplay = document.getElementById("callSignDisplay");

  if (!lfzSelect || !tacSelect || !callSignDisplay) return;

  function loadLFZ(){
    lfzSelect.innerHTML = "<option value=''>-- wählen --</option>";

    getLFZ().forEach((l, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = l.name;
      lfzSelect.appendChild(opt);
    });
  }

  function loadTAC(){
    tacSelect.innerHTML = "<option value=''>-- -- --</option>";

    getTAC().forEach((t, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = t;
      tacSelect.appendChild(opt);
    });
  }

  function updateCallSign(){

    const tacVal = tacSelect.value;
    const lfzVal = lfzSelect.value;

    const lfzData = getLFZ();
    const tacData = getTAC();

    if (tacVal !== "") {
      callSignDisplay.textContent = tacData[tacVal];
    }
    else if (lfzVal !== "") {
      callSignDisplay.textContent = lfzData[lfzVal].cs;
    }
    else {
      callSignDisplay.textContent = "";
    }
  }

  lfzSelect.addEventListener("change", updateCallSign);
  tacSelect.addEventListener("change", updateCallSign);

  loadLFZ();
  loadTAC();
  updateCallSign();
}