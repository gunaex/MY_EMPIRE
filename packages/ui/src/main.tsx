import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppRouter } from './views/AppRouter.js'
import './styles/main.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
)
