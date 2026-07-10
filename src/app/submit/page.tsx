import SubmitForm from '@/components/submit/Form'
import Icon from '@/components/shared/Icon'
import SectionTitle from '@/components/shared/SectionTitle'
import type { IconName } from '@/components/shared/Icon'

// 投稿须知（列表级，纯排版，无卡片边框）
const NOTES: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: 'pencil',
    title: '原创',
    desc: '自己写的才叫好活，搬运和烂大街的过不了查重。',
  },
  {
    icon: 'check-circle',
    title: '审核',
    desc: '投稿后由 AI 自动审核、查重、打标，通过就立刻上架。',
  },
  {
    icon: 'trophy',
    title: '认可',
    desc: '写得好就上首页，赞得多就进英雄榜。',
  },
]

export default function SubmitPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      {/* 页头：统一贴纸标题 + 大黑体 h1 + 粗黑底线 */}
      <div className="mb-8 border-b-4 border-black pb-4 md:mb-10">
        <SectionTitle label="交作业" />
        <h1 className="mt-3 text-3xl font-black tracking-tight text-black md:text-5xl">
          上交我的<span className="text-kfc-red">疯四文案</span>
        </h1>
        <p className="text-news-gray mt-2 text-sm font-bold md:text-base">
          别藏着掖着了，交出你的好活。
        </p>
      </div>

      <SubmitForm />

      {/* 投稿须知：列表级，正文 + 分隔线 */}
      <div className="mx-auto mt-16 max-w-3xl">
        <SectionTitle label="投稿须知" />
        <div className="divide-news-rule border-news-rule mt-4 divide-y border-t">
          {NOTES.map((note) => (
            <div key={note.title} className="flex items-start gap-4 py-5">
              <Icon name={note.icon} className="text-kfc-red mt-0.5 shrink-0 text-2xl" />
              <div>
                <h3 className="text-base font-black text-black">{note.title}</h3>
                <p className="text-news-gray mt-1 text-sm">{note.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-news-gray mt-10 text-center text-xs font-bold">
        投稿全部走 GitHub Issue，公开留痕，过程透明。
      </p>
    </div>
  )
}
