import {IAccountBalance} from "@elrondnetwork/erdjs/out";
import BigNumber from "bignumber.js";

const NUM_DECIMALS = 18;
export default class AccountBalance implements IAccountBalance {
    private value: BigNumber;

    constructor(value: BigNumber.Value) {
        this.value = new BigNumber(value);
    }

    toDenominated(): BigNumber {
        return this.value.shiftedBy(-NUM_DECIMALS);
    }

    toDenominatedString(decimalPlaces = 3): string {
        return this.toDenominated().decimalPlaces(decimalPlaces).toString();
    }

    toPrettyString(decimalPlaces = 3): string {
        return this.toDenominatedString(decimalPlaces);
    }

    toString(): string {
        return this.value.toString();
    }
};