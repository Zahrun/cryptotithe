import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {

  render(): JSX.Element {
    return (
      <Html>
        <Head />
        <body className="bg-light-gray">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument