import { Text } from '@tarojs/components'
import { useState, useEffect } from 'react'

interface CountUpNumberProps {
  end: number
  prefix?: string
  decimals?: number
}

export default function CountUpNumber({ end, prefix = '', decimals = 0 }: CountUpNumberProps) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    // 目标值和当前值
    let start = 0
    let target = end
    let current = start
    const steps = 30 // 分成30步
    let step = 0
    
    const timer = setInterval(() => {
      step++
      current = start + (target - start) * (step / steps)
      setValue(current)
      
      if (step >= steps) {
        setValue(target)
        clearInterval(timer)
      }
    }, 20) // 每20毫秒一步，总时长 20*30 = 600ms
    
    return () => clearInterval(timer)
  }, [end])

  const formattedValue = value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return <Text>{prefix}{formattedValue}</Text>
}