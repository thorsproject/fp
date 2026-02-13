// ------------------ DATE: Punkte einfügen  ------------------
export function initDateInput() {

  const dateInput = document.getElementById("dateInput");
  if (!dateInput) return;

  dateInput.addEventListener("input", (e) => {

    let v = e.target.value.replace(/\D/g,"");

    if(v.length > 2) v = v.slice(0,2) + "." + v.slice(2);
    if(v.length > 5) v = v.slice(0,5) + "." + v.slice(5,7);

    e.target.value = v;
  });

}