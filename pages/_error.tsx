import { NextPageContext } from "next";
import { ReactNode } from "react";

export interface IErrorProps {
    statusCode: number;
}

function Error({ statusCode }: IErrorProps): ReactNode {
    return (
        <p>
        {statusCode
            ? `An error ${statusCode} occurred on server`
            : 'An error occurred on client'}
        </p>
    )
}
  
Error.getInitialProps = ({ res, err }: NextPageContext) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404
    return { statusCode }
}
  
export default Error