"use strict";

const D = Decimal;

// for who want to use time more effective...

// Number related: notation, clearify
// Etc.          : copyObj

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
    },
    copyObj: function (obj) {
        let cObject = {};
        for (let i in obj) {
            if (Array.isArray(obj[i])) {
                cObject[i] = [];
                const tempArr = obj[i];
                for (let j = 0, l = tempArr.length; j < l; j++) {
                    cObject[i].push(tempArr[j] instanceof Decimal ? new D(tempArr[j]) : tempArr[j]);
                }
            } else if (typeof obj[i] === "object" && !(obj[i] instanceof Decimal)) {
                cObject[i] = this.copyObj(obj[i]);
            } else {
                cObject[i] = obj[i] instanceof Decimal ? new D(obj[i]) : obj[i];
          }
        }
        return cObject;
    }
}

window.notation = Spdl.notation;