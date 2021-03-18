const D = Decimal;

const Spdl = {
    notation: function(number, exponentialFix=4, decimalFix=2) {
        number = new D(number);
        if (number.lt(1e5)) return number.toNumber().toFixed(decimalFix);
        if (number.lt(new D(10).pow(new D(10).pow(exponentialFix)))) return number.toExponential(exponentialFix).replace("+", "");
        if (number.lt("1eeeeeeeeee10")) return "e" + number.log(10).floor(0);
        return number.valueOf();
    },
    clearify: function(number) {
        number = new D(number);
        if (number.lt(1000)) return number.floor(0);
        if (number.lt(1e100)) return number.div(new D(10).pow(number.log(10).sub(1))).floor(0).div(10).mul(new D(10).pow(number.log(10)));
        return number;
    }
}

window.notation = Spdl.notation;