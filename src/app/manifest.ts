import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: '肯德基疯狂星期四 VME50',
        short_name: 'VME50',
        description: '肯德基疯狂星期四段子收集站，收录最搞笑的疯狂星期四段子。今天你v50了吗？',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f1ea',
        theme_color: '#c41200',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
            {
                src: '/images/logo.jpg',
                sizes: '192x192',
                type: 'image/jpeg',
            },
            {
                src: '/images/logo.jpg',
                sizes: '512x512',
                type: 'image/jpeg',
            },
            {
                src: '/images/logo.jpg',
                sizes: '512x512',
                type: 'image/jpeg',
                purpose: 'maskable',
            },
        ],
        shortcuts: [
            {
                name: '文案仓库',
                short_name: '仓库',
                description: '查看所有疯狂星期四段子',
                url: '/jokes',
                icons: [{ src: '/favicon.ico', sizes: 'any' }],
            },
            {
                name: '英雄榜',
                short_name: '排名',
                description: '查看最火爆的段子写手',
                url: '/leaderboard',
                icons: [{ src: '/favicon.ico', sizes: 'any' }],
            },
            {
                name: '我要投稿',
                short_name: '投稿',
                description: '提交你的疯四段子',
                url: '/submit',
                icons: [{ src: '/favicon.ico', sizes: 'any' }],
            },
        ],
        screenshots: [
            {
                src: '/images/logo.jpg',
                sizes: '512x512',
                type: 'image/jpeg',
                label: 'KFC Crazy Thursday VME50',
            },
        ],
    }
}
