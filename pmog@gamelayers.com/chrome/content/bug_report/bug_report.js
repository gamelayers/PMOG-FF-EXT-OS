// Called once when the dialog displays
function onLoad() {
    // Use the arguments passed to us by the caller
    document.getElementById("core_dump").value = window.arguments[0].inn.core_dump;
    var version = document.getElementById("version_number");
    version.value = "PMOG Version " + window.arguments[0].inn.pmog.pmog.version;
    version.setAttribute("style","cursor:pointer;");
    version.setAttribute('onclick',"window.arguments[0].inn.pmog.pmog.hud.openAndReuseOneTabPerURL('http://thenethernet.com/about/versions/')");
}

// Called once if and only if the user clicks OK
function onOK() {
    // Return the changed arguments.
    // Notice if user clicks cancel, window.arguments[0].out remains null
    // because this function is never called
    if(document.getElementById("description").value === "") {
        alert("Please describe the bug, it will help us track down your problem.");
        return false;
    } else if(document.getElementById("email").value === "") {
        alert("Please enter your email address");
        return false;
    } else {
        window.arguments[0].out = {
            description: document.getElementById("description").value,
            email: document.getElementById("email").value
        };
    }
    return true;
}