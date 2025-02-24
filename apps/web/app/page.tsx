import { type ImageProps } from 'next/image'

type Props = Omit<ImageProps, 'src'> & {
  srcLight: string
  srcDark: string
}

const msToMinutes = (ms: number) => Math.floor(ms / 60000)

export default async function Home() {
  return <div></div>
}
