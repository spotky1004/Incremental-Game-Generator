let windowBlured = false;
window.blur = () => windowBlured = true;
window.focus = () => windowBlured = false;

const timer = ms => new Promise(
    res => {
        setTimeout(res, ms);
    }
)