import { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email public_repo',
        },
      },
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth 错误:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth 警告:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth 调试:', code, metadata)
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // 可以在这里添加允许/拒绝登录的逻辑
        return true
      } catch (error) {
        console.error('SignIn 回调错误:', error)
        return false // 返回 false 表示拒绝登录
      }
    },
    async jwt({ token, user, account, profile }) {
      try {
        if (user && account) {
          token.id = Number(user.id)
          // 确保 safely 获取 username
          const githubProfile = profile as { login?: string }
          token.username = githubProfile?.login || user.name || 'unknown'
          token.picture = user.image
        }
        // 保存access token到JWT中（只在服务器端可用）
        if (account) {
          token.accessToken = account.access_token
        }
      } catch (error) {
        console.error('JWT 回调错误:', error)
      }
      return token
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          session.user.id = token.id as number
          session.user.username = token.username as string
          session.user.image = token.picture
        }
      } catch (error) {
        console.error('Session 回调错误:', error)
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error', // 错误页面路径
  },
  secret: process.env.NEXTAUTH_SECRET,
}
