import apiClient from './client'

const getIssues = (category?: string) =>
    apiClient.get(`/api/main/issues/${category ? `?category=${category}` : ''}`)

const getIssue = (id: number) =>
    apiClient.get(`/api/main/issues/${id}/`)

const createIssue = (formData: FormData) =>
    apiClient.post('/api/main/issues/', formData, {
        headers: {'Content-Type': 'multipart/form-data'}
    })

const addComment = (issueId: number, comment: string) =>
    apiClient.post(`/api/main/issues/${issueId}/add-comment/`, {comment})

const likeComment = (issueId: number, commentId: number) =>
    apiClient.post(`/api/main/issues/${issueId}/like-comment/`, {comment_id: commentId})

export default {getIssues, getIssue, createIssue, addComment, likeComment}