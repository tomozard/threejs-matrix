import Head from 'next/head'
import dynamic from 'next/dynamic'

// Dynamically import components to avoid SSR issues with Three.js
const MatrixEffect = dynamic(() => import('../components/MatrixEffect'), {
  ssr: false,
})

const VoiceAssistant = dynamic(() => import('../components/VoiceAssistant'), {
  ssr: false,
})

export default function Home() {
  return (
    <>
      <Head>
        <title>Matrix Effect - Three.js</title>
        <meta name="description" content="Matrix Effect with Multi-Language Characters and Voice Assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MatrixEffect />
      <VoiceAssistant showUI={true} />
    </>
  )
}