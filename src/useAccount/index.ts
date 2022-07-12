import {useState} from "react";
import {IAddress, Address} from "@elrondnetwork/erdjs/out";
import {useNetworkProvider} from "../useNetworkProvider";

export const useAccount = () => {
    const networkProvider = useNetworkProvider();
    const [address, setAddress] = useState<IAddress>();
    const [nonce, setNonce] = useState<number>(0);
    // const [balance, setBalance] = useState<>()
    const loadAccount = async (address: string) => {
        console.log(networkProvider)
        const account = await networkProvider.getAccount(Address.fromBech32(address));
        setAddress(account.address);
        setNonce(account.nonce);
    };

    const increaseNonce = () => {
        setNonce(prev => prev + 1);
    }

    return {address, nonce, loadAccount, increaseNonce};
}