/** Насколько близко к низу считаем, что пользователь «внизу» ленты, px */
export const NEAR_BOTTOM = 80

type Scrollable = Pick<HTMLElement, 'scrollHeight' | 'scrollTop' | 'clientHeight'>

export function isNearBottom(element: Scrollable): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM
}
