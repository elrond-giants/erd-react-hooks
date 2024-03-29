import {INetworkProvider} from "@multiversx/sdk-network-providers/out/interface";
import {createContext, PropsWithChildren, useContext} from "react";
import {ApiNetworkProvider} from "@multiversx/sdk-network-providers/out";
import {network} from "../network";
import {NetworkEnv} from "@elrond-giants/erdjs-auth/dist/types";
import {RequireOnlyOne} from "../types";
import {AuthContext} from "../useAuth";
import {getNetworkEnv} from "../utils";

interface IContextValue {
    provider: INetworkProvider;
}

interface IContextProps {
    networkProvider: INetworkProvider;
    env: NetworkEnv
}

// @ts-ignore
export const NetworkContext = createContext<IContextValue>();
export const NetworkProvider = (
    {networkProvider, env, children}: PropsWithChildren<RequireOnlyOne<IContextProps>>
) => {
    const provider = networkProvider ?? getNetworkProvider(env ?? "devnet");
    return <NetworkContext.Provider value={{provider}} children={children}/>
}

export const useNetworkProvider = () => {
    const context = useContext(NetworkContext);
    if (context !== undefined && context.provider !== undefined) {return context.provider;}

    // If this is used outside Network Context Provider, we'll assume
    // that the Auth Context is available and we'll try to get the api url property.
    const authContext = useContext(AuthContext);
    if (authContext !== undefined && authContext.networkOptions !== undefined) {
        if (authContext.networkOptions.apiUrl) {
            return new ApiNetworkProvider(authContext.networkOptions.apiUrl);
        }
        const env = getNetworkEnv(authContext.networkOptions);
        return getNetworkProvider(env);
    }

    // If this is used outside Network Context Provider and Auth Context Provider,
    // we'll throw an error.
    throw new Error("Network Provider not found. Please wrap your component with NetworkProvider.");

}

const getNetworkProvider = (env: NetworkEnv): INetworkProvider => {
    const url = network[env]["api"];

    return new ApiNetworkProvider(url);
}