import * as Bignum from 'bignum';
import * as multiHashing from 'node-multi-hashing';
import * as util from '../misc/Utils';

export const BaseTarget = 0x00000000ffff0000000000000000000000000000000000000000000000000000;

export const POW2_256 = new Bignum(2).pow(256);
export const POW2_128 = new Bignum(2).pow(128);
export const POW2_256_SUB_1 = POW2_256.sub(1);
const POW2_256_64 = new Bignum(2).pow(256 - 64);
const FFFF0000_MUL_POW2_256_64_ADD_1 = new Bignum(0xffff0000).mul(POW2_256_64).add(1);

export function bitsToTarget(bits: number) {
    return new Bignum(bits & 0x00ffffff).mul(new Bignum(2).pow(8 * ((bits >> 24) - 3)));    // return (bits & 0x00ffffff) * Math.pow(2, 8 * ((bits >> 24) - 3));
}

export function targetToBits(target: Bignum) {
    if (target.lt(BaseTarget)) return 0x20010000;

    let buf = target.toBuffer();
    let exponent = buf.length > 15 ? buf.length.toString(16) : '0' + buf.length;
    let coefficient = Array.from(buf.take(3)).map(c => c > 15 ? c.toString(16) : '0' + c.toString(16));
    
    return Number.parseInt([exponent].concat(coefficient).reduce((p, c) => p + c), 16);
}

export function targetToDifficulty(target: Bignum) {
    return FFFF0000_MUL_POW2_256_64_ADD_1.div(target.add(1));    // return (0xffff0000 * Math.pow(2, 256 - 64) + 1) / (target + 1)
}

export function difficultyToTarget(diff: Bignum) {
    if (diff.eq(0)) return POW2_256_SUB_1; //if (diff === 0) return 2 ** 256 - 1;
    let target = FFFF0000_MUL_POW2_256_64_ADD_1.div(diff).sub(1);
    return target.gt(POW2_256_SUB_1) ? POW2_256_SUB_1 : target; // return Math.min(((0xffff0000 * 2 ** (256 - 64) + 1) / diff - 1 + 0.5) | 0, 2 ** 256 - 1)
}

export function bitsToDifficulty(bits: number) {
    return targetToDifficulty(bitsToTarget(bits));
}

export function targetToAverageAttempts(target: Bignum) {
    return POW2_256.div(target.add(1));
}

export function averageAttemptsToTarget(attempts: Bignum) {
    let target = POW2_256.div(attempts).sub(1);
    return target.ge(POW2_256_SUB_1) ? POW2_256_SUB_1 : target;// return Math.min((2 ** 256 / attempts - 1 + 0.5) | 0, 2 ** 256 - 1);
}

export const Algos = {
    sha256d: { hash: function () { return function () { return util.sha256.apply(this, arguments); } } },
    sha256: {
        //Uncomment diff if you want to use hardcoded truncated diff
        //diff: '00000000ffff0000000000000000000000000000000000000000000000000000',
        hash: function () {
            return function () {
                return util.sha256d.apply(this, arguments);
            }
        }
    },
    'scrypt': {
        //Uncomment diff if you want to use hardcoded truncated diff
        //diff: '0000ffff00000000000000000000000000000000000000000000000000000000',
        multiplier: Math.pow(2, 16),
        hash: function (coinConfig) {
            let nValue = coinConfig.nValue || 1024;
            let rValue = coinConfig.rValue || 1;
            return function (data) {
                return multiHashing.scrypt(data, nValue, rValue);
            }
        }
    },
    'scrypt-og': {
        //Aiden settings
        //Uncomment diff if you want to use hardcoded truncated diff
        //diff: '0000ffff00000000000000000000000000000000000000000000000000000000',
        multiplier: Math.pow(2, 16),
        hash: function (coinConfig) {
            let nValue = coinConfig.nValue || 64;
            let rValue = coinConfig.rValue || 1;
            return function (data) {
                return multiHashing.scrypt(data, nValue, rValue);
            }
        }
    },
    'scrypt-jane': {
        multiplier: Math.pow(2, 16),
        hash: function (coinConfig) {
            let nTimestamp = coinConfig.chainStartTime || 1367991200;
            let nMin = coinConfig.nMin || 4;
            let nMax = coinConfig.nMax || 30;
            return function (data, nTime) {
                return multiHashing.scryptjane(data, nTime, nTimestamp, nMin, nMax);
            }
        }
    },
    'scrypt-n': {
        multiplier: Math.pow(2, 16),
        hash: function (coinConfig) {

            let timeTable = coinConfig.timeTable || {
                "2048": 1389306217, "4096": 1456415081, "8192": 1506746729, "16384": 1557078377, "32768": 1657741673,
                "65536": 1859068265, "131072": 2060394857, "262144": 1722307603, "524288": 1769642992
            };

            let nFactor = (function () {
                let n = Object.keys(timeTable).sort().reverse().filter(function (nKey) {
                    return Date.now() / 1000 > timeTable[nKey];
                })[0];

                let nInt = parseInt(n);
                return Math.log(nInt) / Math.log(2);
            })();

            return function (data) {
                return multiHashing.scryptn(data, nFactor);
            }
        }
    },
    sha1: {
        hash: function () {
            return function () {
                return multiHashing.sha1.apply(this, arguments);
            }
        }
    },
    x11: {
        hash: function () {
            return function () {
                return multiHashing.x11.apply(this, arguments);
            }
        }
    },
    x13: {
        hash: function () {
            return function () {
                return multiHashing.x13.apply(this, arguments);
            }
        }
    },
    x15: {
        hash: function () {
            return function () {
                return multiHashing.x15.apply(this, arguments);
            }
        }
    },
    nist5: {
        hash: function () {
            return function () {
                return multiHashing.nist5.apply(this, arguments);
            }
        }
    },
    quark: {
        hash: function () {
            return function () {
                return multiHashing.quark.apply(this, arguments);
            }
        }
    },
    keccak: {
        multiplier: Math.pow(2, 8),
        hash: function (coinConfig) {
            if (coinConfig.normalHashing === true) {
                return function (data, nTimeInt) {
                    return multiHashing.keccak(multiHashing.keccak(Buffer.concat([data, new Buffer(nTimeInt.toString(16), 'hex')])));
                };
            }
            else {
                return function () {
                    return multiHashing.keccak.apply(this, arguments);
                }
            }
        }
    },
    blake: {
        multiplier: Math.pow(2, 8),
        hash: function () {
            return function () {
                return multiHashing.blake.apply(this, arguments);
            }
        }
    },
    skein: {
        hash: function () {
            return function () {
                return multiHashing.skein.apply(this, arguments);
            }
        }
    },
    groestl: {
        multiplier: Math.pow(2, 8),
        hash: function () {
            return function () {
                return multiHashing.groestl.apply(this, arguments);
            }
        }
    },
    fugue: {
        multiplier: Math.pow(2, 8),
        hash: function () {
            return function () {
                return multiHashing.fugue.apply(this, arguments);
            }
        }
    },
    shavite3: {
        hash: function () {
            return function () {
                return multiHashing.shavite3.apply(this, arguments);
            }
        }
    },
    hefty1: {
        hash: function () {
            return function () {
                return multiHashing.hefty1.apply(this, arguments);
            }
        }
    },
    qubit: {
        hash: function () {
            return function () {
                return multiHashing.qubit.apply(this, arguments);
            }
        }
    },
    'yescrypt': {
        multiplier: Math.pow(2, 16),
        hash: function () {
            return function () {
                return multiHashing.yescrypt.apply(this, arguments);
            }
        }
    },
    s3: {
        hash: function () {
            return function () {
                return multiHashing.s3.apply(this, arguments);
            }
        }
    },
    // lyra2re: {
    //     multiplier: Math.pow(2, 7),
    //     hash: function () {
    //         return function () {
    //             return multiHashing.lyra2re.apply(this, arguments);
    //         }
    //     }
    // },
    neoscrypt: {
        multiplier: Math.pow(2, 16),
        hash: function () {
            return function () {
                return multiHashing.neoscrypt.apply(this, arguments);
            }
        }
    },
    dcrypt: {
        hash: function () {
            return function () {
                return multiHashing.dcrypt.apply(this, arguments);
            }
        }
    }
};

Algos.sha256d = Algos.sha256;

for (let algo in Algos) {
    if (!Algos[algo].multiplier)
        Algos[algo].multiplier = 1;

    /*if (algos[algo].diff){
        algos[algo].maxDiff = bignum(algos[algo].diff, 16);
    }
    else if (algos[algo].shift){
        algos[algo].nonTruncatedDiff = util.shiftMax256Right(algos[algo].shift);
        algos[algo].bits = util.bufferToCompactBits(algos[algo].nonTruncatedDiff);
        algos[algo].maxDiff = bignum.fromBuffer(util.convertBitsToBuff(algos[algo].bits));
    }
    else if (algos[algo].multiplier){
        algos[algo].maxDiff = baseDiff.mul(Math.pow(2, 32) / algos[algo].multiplier);
    }
    else{
        algos[algo].maxDiff = baseDiff;
    }*/
}
