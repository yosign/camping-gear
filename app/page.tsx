import { redirect } from 'next/navigation'

// 首页直接展示像素徒步 Demo
export default function HomePage() {
  redirect('/hiking-demo.html')
}
