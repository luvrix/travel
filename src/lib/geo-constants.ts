/** 直辖市列表（高德 POI 返回里这类城市的 cityname 常为空） */
const MUNICIPALITIES = ['北京', '上海', '天津', '重庆']

/** 判断省名是否是直辖市 */
export function isMunicipality(pname: string): boolean {
  return MUNICIPALITIES.some(m => pname.includes(m))
}
