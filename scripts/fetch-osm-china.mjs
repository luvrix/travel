#!/usr/bin/env node
/**
 * 从 OpenStreetMap Overpass API 采集中国景点数据
 *
 * 策略：
 *   - 城市用内置固定列表（350 个地级市，坐标准确）
 *   - 景点从 OSM Overpass API 按省份抓取
 *   - 支持断点续传
 *
 * 用法：node scripts/fetch-osm-china.mjs
 * 输出：scripts/raw-china.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir         = dirname(fileURLToPath(import.meta.url))
const RAW_FILE      = join(__dir, 'raw-china.json')
const PROGRESS_FILE = join(__dir, 'osm-progress.json')

const DELAY_MS    = 4000   // 每次查询间隔 4s（保守）
const RETRY_DELAY = 20000  // 失败后等 20s

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
let endpointIdx = 0

// ── 固定城市列表（350 个地级市 + 港澳台）─────────────────────────
const CITIES = [
  // 直辖市
  { name: '北京', lat: 39.9042, lng: 116.4074 },
  { name: '天津', lat: 39.3434, lng: 117.3616 },
  { name: '上海', lat: 31.2304, lng: 121.4737 },
  { name: '重庆', lat: 29.5630, lng: 106.5516 },
  // 河北
  { name: '石家庄', lat: 38.0428, lng: 114.5149 }, { name: '唐山', lat: 39.6307, lng: 118.1802 },
  { name: '秦皇岛', lat: 39.9356, lng: 119.5996 }, { name: '邯郸', lat: 36.6256, lng: 114.5389 },
  { name: '邢台', lat: 37.0682, lng: 114.5043 }, { name: '保定', lat: 38.8663, lng: 115.4986 },
  { name: '张家口', lat: 40.8244, lng: 114.8844 }, { name: '承德', lat: 40.9516, lng: 117.9635 },
  { name: '沧州', lat: 38.3045, lng: 116.8388 }, { name: '廊坊', lat: 39.5380, lng: 116.7036 },
  { name: '衡水', lat: 37.7394, lng: 115.6706 },
  // 山西
  { name: '太原', lat: 37.8706, lng: 112.5489 }, { name: '大同', lat: 40.0770, lng: 113.3000 },
  { name: '朔州', lat: 39.3317, lng: 112.4328 }, { name: '忻州', lat: 38.4181, lng: 112.7337 },
  { name: '阳泉', lat: 37.8581, lng: 113.5800 }, { name: '吕梁', lat: 37.5185, lng: 111.1441 },
  { name: '晋中', lat: 37.6867, lng: 112.7526 }, { name: '长治', lat: 36.1954, lng: 113.1166 },
  { name: '晋城', lat: 35.4906, lng: 112.8516 }, { name: '临汾', lat: 36.0880, lng: 111.5190 },
  { name: '运城', lat: 35.0224, lng: 111.0038 },
  // 内蒙古
  { name: '呼和浩特', lat: 40.8427, lng: 111.7490 }, { name: '包头', lat: 40.6567, lng: 109.8401 },
  { name: '乌海', lat: 39.6555, lng: 106.7945 }, { name: '赤峰', lat: 42.2589, lng: 118.8890 },
  { name: '通辽', lat: 43.6025, lng: 122.2574 }, { name: '鄂尔多斯', lat: 39.6086, lng: 109.7813 },
  { name: '呼伦贝尔', lat: 49.2124, lng: 119.7654 }, { name: '巴彦淖尔', lat: 40.7539, lng: 107.3880 },
  { name: '乌兰察布', lat: 40.9942, lng: 113.1140 }, { name: '兴安盟', lat: 46.0767, lng: 122.0442 },
  { name: '锡林郭勒', lat: 43.9333, lng: 116.0833 }, { name: '阿拉善', lat: 38.8440, lng: 105.7293 },
  // 辽宁
  { name: '沈阳', lat: 41.8057, lng: 123.4315 }, { name: '大连', lat: 38.9140, lng: 121.6147 },
  { name: '鞍山', lat: 41.1077, lng: 122.9953 }, { name: '抚顺', lat: 41.8795, lng: 123.9573 },
  { name: '本溪', lat: 41.2968, lng: 123.7651 }, { name: '丹东', lat: 40.1288, lng: 124.3949 },
  { name: '锦州', lat: 41.0950, lng: 121.1269 }, { name: '营口', lat: 40.6674, lng: 122.2353 },
  { name: '阜新', lat: 42.0116, lng: 121.6485 }, { name: '辽阳', lat: 41.2693, lng: 123.1722 },
  { name: '盘锦', lat: 41.1199, lng: 122.0695 }, { name: '铁岭', lat: 42.2987, lng: 123.8442 },
  { name: '朝阳', lat: 41.5676, lng: 120.4507 }, { name: '葫芦岛', lat: 40.7110, lng: 120.8366 },
  // 吉林
  { name: '长春', lat: 43.8171, lng: 125.3235 }, { name: '吉林市', lat: 43.8378, lng: 126.5496 },
  { name: '四平', lat: 43.1665, lng: 124.3506 }, { name: '辽源', lat: 42.9023, lng: 125.1453 },
  { name: '通化', lat: 41.7279, lng: 125.9398 }, { name: '白山', lat: 41.9422, lng: 126.4196 },
  { name: '松原', lat: 45.1416, lng: 124.8246 }, { name: '白城', lat: 45.6197, lng: 122.8387 },
  { name: '延边', lat: 42.8910, lng: 129.5099 },
  // 黑龙江
  { name: '哈尔滨', lat: 45.8038, lng: 126.5349 }, { name: '齐齐哈尔', lat: 47.3548, lng: 123.9180 },
  { name: '鸡西', lat: 45.2950, lng: 130.9756 }, { name: '鹤岗', lat: 47.3497, lng: 130.2775 },
  { name: '双鸭山', lat: 46.6433, lng: 131.1538 }, { name: '大庆', lat: 46.5898, lng: 125.1033 },
  { name: '伊春', lat: 47.7273, lng: 128.8406 }, { name: '佳木斯', lat: 46.7994, lng: 130.3234 },
  { name: '七台河', lat: 45.7708, lng: 131.0032 }, { name: '牡丹江', lat: 44.5519, lng: 129.6328 },
  { name: '黑河', lat: 50.2455, lng: 127.5283 }, { name: '绥化', lat: 46.6377, lng: 126.9928 },
  { name: '大兴安岭', lat: 51.9913, lng: 124.1152 },
  // 江苏
  { name: '南京', lat: 32.0603, lng: 118.7969 }, { name: '无锡', lat: 31.4904, lng: 120.3119 },
  { name: '徐州', lat: 34.2044, lng: 117.2854 }, { name: '常州', lat: 31.7747, lng: 119.9741 },
  { name: '苏州', lat: 31.2990, lng: 120.5853 }, { name: '南通', lat: 32.0097, lng: 120.8741 },
  { name: '连云港', lat: 34.5975, lng: 119.2232 }, { name: '淮安', lat: 33.5503, lng: 119.0213 },
  { name: '盐城', lat: 33.3479, lng: 120.1630 }, { name: '扬州', lat: 32.3939, lng: 119.4128 },
  { name: '镇江', lat: 32.1884, lng: 119.4250 }, { name: '泰州', lat: 32.4573, lng: 119.9229 },
  { name: '宿迁', lat: 33.9631, lng: 118.2752 },
  // 浙江
  { name: '杭州', lat: 30.2741, lng: 120.1551 }, { name: '宁波', lat: 29.8683, lng: 121.5440 },
  { name: '温州', lat: 28.0005, lng: 120.6721 }, { name: '嘉兴', lat: 30.7522, lng: 120.7551 },
  { name: '湖州', lat: 30.8933, lng: 120.0934 }, { name: '绍兴', lat: 30.0302, lng: 120.5800 },
  { name: '金华', lat: 29.0785, lng: 119.6474 }, { name: '衢州', lat: 28.9359, lng: 118.8592 },
  { name: '舟山', lat: 29.9850, lng: 122.2067 }, { name: '台州', lat: 28.6563, lng: 121.4208 },
  { name: '丽水', lat: 28.4568, lng: 119.9224 },
  // 安徽
  { name: '合肥', lat: 31.8206, lng: 117.2272 }, { name: '芜湖', lat: 31.3526, lng: 118.4330 },
  { name: '蚌埠', lat: 32.9162, lng: 117.3634 }, { name: '淮南', lat: 32.6250, lng: 116.9999 },
  { name: '马鞍山', lat: 31.6895, lng: 118.5069 }, { name: '淮北', lat: 33.9555, lng: 116.7943 },
  { name: '铜陵', lat: 30.9444, lng: 117.8122 }, { name: '安庆', lat: 30.5433, lng: 117.0634 },
  { name: '黄山', lat: 29.7147, lng: 118.3378 }, { name: '滁州', lat: 32.3008, lng: 118.3169 },
  { name: '阜阳', lat: 32.8996, lng: 115.8151 }, { name: '宿州', lat: 33.6462, lng: 116.9765 },
  { name: '六安', lat: 31.7378, lng: 116.5148 }, { name: '亳州', lat: 33.8440, lng: 115.7783 },
  { name: '池州', lat: 30.6636, lng: 117.4908 }, { name: '宣城', lat: 30.9408, lng: 118.7589 },
  // 福建
  { name: '福州', lat: 26.0745, lng: 119.2965 }, { name: '厦门', lat: 24.4798, lng: 118.0894 },
  { name: '莆田', lat: 25.4531, lng: 119.0078 }, { name: '三明', lat: 26.2659, lng: 117.6156 },
  { name: '泉州', lat: 24.8742, lng: 118.6757 }, { name: '漳州', lat: 24.5132, lng: 117.6480 },
  { name: '南平', lat: 26.6430, lng: 118.1782 }, { name: '龙岩', lat: 25.0789, lng: 117.0174 },
  { name: '宁德', lat: 26.6556, lng: 119.5226 },
  // 江西
  { name: '南昌', lat: 28.6820, lng: 115.8581 }, { name: '景德镇', lat: 29.2685, lng: 117.1783 },
  { name: '萍乡', lat: 27.6233, lng: 113.8546 }, { name: '九江', lat: 29.7052, lng: 115.9922 },
  { name: '新余', lat: 27.8174, lng: 114.9159 }, { name: '鹰潭', lat: 28.2602, lng: 116.9351 },
  { name: '赣州', lat: 25.8309, lng: 114.9356 }, { name: '吉安', lat: 27.1115, lng: 114.9927 },
  { name: '宜春', lat: 27.8154, lng: 114.4160 }, { name: '抚州', lat: 27.9540, lng: 116.3582 },
  { name: '上饶', lat: 28.4540, lng: 117.9434 },
  // 山东
  { name: '济南', lat: 36.6512, lng: 117.1201 }, { name: '青岛', lat: 36.0671, lng: 120.3826 },
  { name: '淄博', lat: 36.8131, lng: 118.0548 }, { name: '枣庄', lat: 34.8107, lng: 117.5568 },
  { name: '东营', lat: 37.4340, lng: 118.6747 }, { name: '烟台', lat: 37.4636, lng: 121.4479 },
  { name: '潍坊', lat: 36.7071, lng: 119.1618 }, { name: '济宁', lat: 35.4151, lng: 116.5868 },
  { name: '泰安', lat: 36.2044, lng: 117.0876 }, { name: '威海', lat: 37.5131, lng: 122.1200 },
  { name: '日照', lat: 35.4164, lng: 119.5271 }, { name: '临沂', lat: 35.1046, lng: 118.3564 },
  { name: '德州', lat: 37.4361, lng: 116.3590 }, { name: '聊城', lat: 36.4561, lng: 115.9854 },
  { name: '滨州', lat: 37.3827, lng: 117.9724 }, { name: '菏泽', lat: 35.2334, lng: 115.4808 },
  // 河南
  { name: '郑州', lat: 34.7466, lng: 113.6254 }, { name: '开封', lat: 34.7975, lng: 114.3069 },
  { name: '洛阳', lat: 34.6197, lng: 112.4540 }, { name: '平顶山', lat: 33.7665, lng: 113.2919 },
  { name: '安阳', lat: 36.0998, lng: 114.3926 }, { name: '鹤壁', lat: 35.7489, lng: 114.2974 },
  { name: '新乡', lat: 35.3031, lng: 113.9267 }, { name: '焦作', lat: 35.2154, lng: 113.2418 },
  { name: '濮阳', lat: 35.7620, lng: 114.9988 }, { name: '许昌', lat: 34.0357, lng: 113.8523 },
  { name: '漯河', lat: 33.5758, lng: 114.0164 }, { name: '三门峡', lat: 34.7726, lng: 111.2006 },
  { name: '南阳', lat: 32.9973, lng: 112.5291 }, { name: '商丘', lat: 34.4141, lng: 115.6561 },
  { name: '信阳', lat: 32.1284, lng: 114.0913 }, { name: '周口', lat: 33.6258, lng: 114.6496 },
  { name: '驻马店', lat: 32.9841, lng: 114.0221 }, { name: '济源', lat: 35.0901, lng: 112.5919 },
  // 湖北
  { name: '武汉', lat: 30.5928, lng: 114.3055 }, { name: '黄石', lat: 30.1991, lng: 115.0386 },
  { name: '十堰', lat: 32.6290, lng: 110.7987 }, { name: '宜昌', lat: 30.6922, lng: 111.2861 },
  { name: '襄阳', lat: 32.0098, lng: 112.1221 }, { name: '鄂州', lat: 30.3905, lng: 114.8949 },
  { name: '荆门', lat: 31.0354, lng: 112.1993 }, { name: '孝感', lat: 30.9244, lng: 113.9268 },
  { name: '荆州', lat: 30.3352, lng: 112.2384 }, { name: '黄冈', lat: 30.4534, lng: 114.8729 },
  { name: '咸宁', lat: 29.8413, lng: 114.3224 }, { name: '随州', lat: 31.6901, lng: 113.3826 },
  { name: '恩施', lat: 30.2720, lng: 109.4880 },
  // 湖南
  { name: '长沙', lat: 28.2282, lng: 112.9388 }, { name: '株洲', lat: 27.8274, lng: 113.1340 },
  { name: '湘潭', lat: 27.8298, lng: 112.9442 }, { name: '衡阳', lat: 26.8936, lng: 112.5720 },
  { name: '邵阳', lat: 27.2387, lng: 111.4683 }, { name: '岳阳', lat: 29.3561, lng: 113.1289 },
  { name: '常德', lat: 29.0318, lng: 111.6986 }, { name: '张家界', lat: 29.1171, lng: 110.4793 },
  { name: '益阳', lat: 28.5538, lng: 112.3554 }, { name: '郴州', lat: 25.7706, lng: 113.0147 },
  { name: '永州', lat: 26.4345, lng: 111.6133 }, { name: '怀化', lat: 27.5501, lng: 109.9972 },
  { name: '娄底', lat: 27.7006, lng: 111.9944 }, { name: '湘西', lat: 28.3119, lng: 109.7392 },
  // 广东
  { name: '广州', lat: 23.1291, lng: 113.2644 }, { name: '深圳', lat: 22.5431, lng: 114.0579 },
  { name: '珠海', lat: 22.2710, lng: 113.5767 }, { name: '汕头', lat: 23.3535, lng: 116.6818 },
  { name: '佛山', lat: 23.0218, lng: 113.1218 }, { name: '韶关', lat: 24.8107, lng: 113.5975 },
  { name: '湛江', lat: 21.2707, lng: 110.3594 }, { name: '肇庆', lat: 23.0470, lng: 112.4652 },
  { name: '江门', lat: 22.5789, lng: 113.0815 }, { name: '茂名', lat: 21.6627, lng: 110.9255 },
  { name: '惠州', lat: 23.1116, lng: 114.4161 }, { name: '梅州', lat: 24.2884, lng: 116.1228 },
  { name: '汕尾', lat: 22.7862, lng: 115.3753 }, { name: '河源', lat: 23.7432, lng: 114.6978 },
  { name: '阳江', lat: 21.8580, lng: 111.9822 }, { name: '清远', lat: 23.6817, lng: 113.0560 },
  { name: '东莞', lat: 23.0208, lng: 113.7518 }, { name: '中山', lat: 22.5176, lng: 113.3929 },
  { name: '潮州', lat: 23.6567, lng: 116.6227 }, { name: '揭阳', lat: 23.5500, lng: 116.3727 },
  { name: '云浮', lat: 22.9151, lng: 112.0444 },
  // 广西
  { name: '南宁', lat: 22.8170, lng: 108.3665 }, { name: '柳州', lat: 24.3260, lng: 109.4116 },
  { name: '桂林', lat: 25.2742, lng: 110.2990 }, { name: '梧州', lat: 23.4770, lng: 111.2791 },
  { name: '北海', lat: 21.4733, lng: 109.1198 }, { name: '防城港', lat: 21.6146, lng: 108.3545 },
  { name: '钦州', lat: 21.9813, lng: 108.6543 }, { name: '贵港', lat: 23.1114, lng: 109.5982 },
  { name: '玉林', lat: 22.6541, lng: 110.1540 }, { name: '百色', lat: 23.9026, lng: 106.6180 },
  { name: '贺州', lat: 24.4033, lng: 111.5527 }, { name: '河池', lat: 24.6926, lng: 108.0854 },
  { name: '来宾', lat: 23.7505, lng: 109.2214 }, { name: '崇左', lat: 22.3765, lng: 107.3643 },
  // 海南
  { name: '海口', lat: 20.0444, lng: 110.1999 }, { name: '三亚', lat: 18.2528, lng: 109.5020 },
  { name: '三沙', lat: 16.8314, lng: 112.3350 }, { name: '儋州', lat: 19.5175, lng: 109.5768 },
  // 四川
  { name: '成都', lat: 30.5728, lng: 104.0668 }, { name: '自贡', lat: 29.3393, lng: 104.7784 },
  { name: '攀枝花', lat: 26.5823, lng: 101.7188 }, { name: '泸州', lat: 28.8717, lng: 105.4423 },
  { name: '德阳', lat: 31.1270, lng: 104.3981 }, { name: '绵阳', lat: 31.4679, lng: 104.6796 },
  { name: '广元', lat: 32.4353, lng: 105.8430 }, { name: '遂宁', lat: 30.5333, lng: 105.5928 },
  { name: '内江', lat: 29.5800, lng: 105.0586 }, { name: '乐山', lat: 29.5521, lng: 103.7660 },
  { name: '南充', lat: 30.8373, lng: 106.1107 }, { name: '眉山', lat: 30.0757, lng: 103.8318 },
  { name: '宜宾', lat: 28.7513, lng: 104.6417 }, { name: '广安', lat: 30.4741, lng: 106.6333 },
  { name: '达州', lat: 31.2090, lng: 107.4682 }, { name: '雅安', lat: 29.9800, lng: 103.0010 },
  { name: '巴中', lat: 31.8691, lng: 106.7478 }, { name: '资阳', lat: 30.1222, lng: 104.6279 },
  { name: '阿坝', lat: 31.8990, lng: 102.2214 }, { name: '甘孜', lat: 30.0486, lng: 101.9625 },
  { name: '凉山', lat: 27.8868, lng: 102.2645 },
  // 贵州
  { name: '贵阳', lat: 26.6470, lng: 106.6302 }, { name: '六盘水', lat: 26.5948, lng: 104.8333 },
  { name: '遵义', lat: 27.7254, lng: 106.9273 }, { name: '安顺', lat: 26.2456, lng: 105.9462 },
  { name: '毕节', lat: 27.3019, lng: 105.2847 }, { name: '铜仁', lat: 27.7183, lng: 109.1896 },
  { name: '黔西南', lat: 25.0880, lng: 104.9063 }, { name: '黔东南', lat: 26.5835, lng: 107.9829 },
  { name: '黔南', lat: 26.2582, lng: 107.5170 },
  // 云南
  { name: '昆明', lat: 25.0389, lng: 102.7183 }, { name: '曲靖', lat: 25.4900, lng: 103.7961 },
  { name: '玉溪', lat: 24.3518, lng: 102.5457 }, { name: '保山', lat: 25.1120, lng: 99.1671 },
  { name: '昭通', lat: 27.3400, lng: 103.7250 }, { name: '丽江', lat: 26.8721, lng: 100.2299 },
  { name: '普洱', lat: 22.8252, lng: 100.9660 }, { name: '临沧', lat: 23.8866, lng: 100.0927 },
  { name: '楚雄', lat: 25.0292, lng: 101.5280 }, { name: '红河', lat: 23.3640, lng: 103.3756 },
  { name: '文山', lat: 23.3693, lng: 104.2446 }, { name: '西双版纳', lat: 22.0074, lng: 100.7971 },
  { name: '大理', lat: 25.6065, lng: 100.2676 }, { name: '德宏', lat: 24.4367, lng: 98.5854 },
  { name: '怒江', lat: 25.8170, lng: 98.8543 }, { name: '迪庆', lat: 27.8190, lng: 99.7064 },
  // 西藏
  { name: '拉萨', lat: 29.6500, lng: 91.1000 }, { name: '日喀则', lat: 29.2671, lng: 88.8808 },
  { name: '昌都', lat: 31.1369, lng: 97.1787 }, { name: '林芝', lat: 29.6491, lng: 94.3615 },
  { name: '山南', lat: 29.2360, lng: 91.7730 }, { name: '那曲', lat: 31.4762, lng: 92.0513 },
  { name: '阿里', lat: 32.5011, lng: 80.1055 },
  // 陕西
  { name: '西安', lat: 34.3416, lng: 108.9398 }, { name: '铜川', lat: 34.8966, lng: 108.9451 },
  { name: '宝鸡', lat: 34.3617, lng: 107.2370 }, { name: '咸阳', lat: 34.3296, lng: 108.7089 },
  { name: '渭南', lat: 34.4998, lng: 109.5098 }, { name: '延安', lat: 36.5853, lng: 109.4898 },
  { name: '汉中', lat: 33.0674, lng: 107.0230 }, { name: '榆林', lat: 38.2854, lng: 109.7348 },
  { name: '安康', lat: 32.6900, lng: 109.0293 }, { name: '商洛', lat: 33.8700, lng: 109.9400 },
  // 甘肃
  { name: '兰州', lat: 36.0611, lng: 103.8343 }, { name: '嘉峪关', lat: 39.7732, lng: 98.2892 },
  { name: '金昌', lat: 38.5160, lng: 102.1878 }, { name: '白银', lat: 36.5448, lng: 104.1389 },
  { name: '天水', lat: 34.5809, lng: 105.7249 }, { name: '武威', lat: 37.9283, lng: 102.6346 },
  { name: '张掖', lat: 38.9262, lng: 100.4495 }, { name: '平凉', lat: 35.5428, lng: 106.6652 },
  { name: '酒泉', lat: 39.7321, lng: 98.4941 }, { name: '庆阳', lat: 35.7341, lng: 107.6380 },
  { name: '定西', lat: 35.5806, lng: 104.6265 }, { name: '陇南', lat: 33.3886, lng: 104.9217 },
  { name: '临夏', lat: 35.6012, lng: 103.2106 }, { name: '甘南', lat: 34.9864, lng: 102.9109 },
  // 青海
  { name: '西宁', lat: 36.6171, lng: 101.7782 }, { name: '海东', lat: 36.5029, lng: 102.1028 },
  { name: '海北', lat: 36.9541, lng: 100.9010 }, { name: '黄南', lat: 35.5177, lng: 102.0153 },
  { name: '海南', lat: 36.2864, lng: 100.6198 }, { name: '果洛', lat: 34.4804, lng: 100.2447 },
  { name: '玉树', lat: 33.0043, lng: 97.0069 }, { name: '海西', lat: 37.3737, lng: 97.3708 },
  // 宁夏
  { name: '银川', lat: 38.4872, lng: 106.2309 }, { name: '石嘴山', lat: 39.0133, lng: 106.3762 },
  { name: '吴忠', lat: 37.9862, lng: 106.1991 }, { name: '固原', lat: 36.0160, lng: 106.2425 },
  { name: '中卫', lat: 37.5149, lng: 105.1966 },
  // 新疆
  { name: '乌鲁木齐', lat: 43.8256, lng: 87.6168 }, { name: '克拉玛依', lat: 45.5798, lng: 84.8893 },
  { name: '吐鲁番', lat: 42.9513, lng: 89.1898 }, { name: '哈密', lat: 42.8332, lng: 93.5151 },
  { name: '昌吉', lat: 44.0145, lng: 87.3082 }, { name: '博尔塔拉', lat: 44.9052, lng: 82.0748 },
  { name: '巴音郭楞', lat: 41.7689, lng: 86.1510 }, { name: '阿克苏', lat: 41.1673, lng: 80.2610 },
  { name: '克孜勒苏', lat: 39.7142, lng: 76.1677 }, { name: '喀什', lat: 39.4677, lng: 75.9891 },
  { name: '和田', lat: 37.1104, lng: 79.9267 }, { name: '伊犁', lat: 43.9190, lng: 81.3244 },
  { name: '塔城', lat: 46.7453, lng: 82.9857 }, { name: '阿勒泰', lat: 47.8484, lng: 88.1396 },
  // 港澳台
  { name: '香港', lat: 22.3193, lng: 114.1694 }, { name: '澳门', lat: 22.1987, lng: 113.5439 },
  { name: '台北', lat: 25.0330, lng: 121.5654 }, { name: '台中', lat: 24.1477, lng: 120.6736 },
  { name: '台南', lat: 22.9999, lng: 120.2269 }, { name: '高雄', lat: 22.6273, lng: 120.3014 },
]

// ── 省份列表 ──────────────────────────────────────────────────
const PROVINCES = [
  '北京市', '天津市', '河北省', '山西省', '内蒙古自治区',
  '辽宁省', '吉林省', '黑龙江省',
  '上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省',
  '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区', '海南省',
  '重庆市', '四川省', '贵州省', '云南省', '西藏自治区',
  '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区',
  '香港特别行政区', '澳门特别行政区', '台湾省',
]

// ── 工具函数 ──────────────────────────────────────────────────
const CJK_RE    = /[一-鿿㐀-䶿]/
const hasChinese = s => s && CJK_RE.test(s)
const sleep      = ms => new Promise(r => setTimeout(r, ms))

function getZhName(tags) {
  const zh = tags['name:zh']
  if (zh && hasChinese(zh)) return zh.trim()
  const n  = tags['name']
  if (n  && hasChinese(n))  return n.trim()
  return null
}

function coords(el) {
  if (el.type === 'node') return { lat: el.lat,        lng: el.lon        }
  if (el.center)          return { lat: el.center.lat, lng: el.center.lon }
  return null
}

async function overpassPost(query) {
  const endpoint = ENDPOINTS[endpointIdx % ENDPOINTS.length]
  const res = await fetch(endpoint, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   'TravelPlannerApp/1.0 (open source travel planner)',
      'Accept':       'application/json',
    },
  })
  if (!res.ok) {
    endpointIdx++
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} (${endpoint.replace('https://', '').split('/')[0]}): ${text.slice(0, 60)}`)
  }
  return res.json()
}

async function queryWithRetry(query, label, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try { return await overpassPost(query) } catch (e) {
      process.stdout.write(`\n  ⚠️  ${label} 第${i+1}次: ${e.message}`)
      if (i < retries - 1) await sleep(RETRY_DELAY)
    }
  }
  process.stdout.write('\n')
  return null
}

// ── 景点查询（只抓景点，城市用固定列表）──────────────────────────
async function fetchAttractions(province) {
  const q = `
[out:json][timeout:120];
area["admin_level"="4"]["name"="${province}"]->.prov;
(
  nwr["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park|gallery|aquarium|artwork)$"]["name"](area.prov);
  nwr["historic"~"^(monument|ruins|archaeological_site|memorial|fort|temple|palace|city_gate|tower|landmark)$"]["name"](area.prov);
  nwr["natural"~"^(peak|bay|beach|hot_spring|cave_entrance|waterfall|glacier|lake)$"]["name"](area.prov);
  nwr["leisure"~"^(park|nature_reserve|garden)$"]["name"]["leisure"!="pitch"]["leisure"!="sports_centre"](area.prov);
  nwr["amenity"~"^(place_of_worship|theatre)$"]["name"](area.prov);
);
out center body;`
  const data = await queryWithRetry(q, `景点-${province}`)
  if (!data) return null

  const seen = new Set()
  const out  = []
  for (const el of data.elements ?? []) {
    const name = getZhName(el.tags ?? {})
    if (!name) continue
    const c = coords(el)
    if (!c) continue
    if (seen.has(name)) continue
    seen.add(name)
    out.push({ name, lat: c.lat, lng: c.lng, category: 'attraction' })
  }
  return out
}

// ── 主流程 ────────────────────────────────────────────────────
async function main() {
  const progress = existsSync(PROGRESS_FILE)
    ? JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    : { done: [], attractions: [] }

  // 检测损坏的进度（done 有记录但 attractions 为空）
  const attrsOk = (progress.attractions?.length ?? 0) > 0
  const doneSet      = new Set(attrsOk ? (progress.done ?? []) : [])
  let allAttractions = attrsOk ? (progress.attractions ?? []) : []

  if (!attrsOk && progress.done?.length > 0) {
    console.log(`⚠️  进度文件损坏（${progress.done.length} 省已记录但数据为空），重新采集`)
    writeFileSync(PROGRESS_FILE, JSON.stringify({ done: [], attractions: [] }))
  }

  const remaining = PROVINCES.filter(p => !doneSet.has(p))
  console.log(`共 ${PROVINCES.length} 省，已完成 ${doneSet.size}，剩余 ${remaining.length}`)

  for (let i = 0; i < remaining.length; i++) {
    const prov = remaining[i]
    const no   = doneSet.size + i + 1
    process.stdout.write(`[${no}/${PROVINCES.length}] ${prov} ... `)

    const attrs = await fetchAttractions(prov)
    await sleep(DELAY_MS)

    if (attrs === null) {
      console.log(`❌ 失败，下次重试`)
      continue
    }

    allAttractions.push(...attrs)
    doneSet.add(prov)
    console.log(`景点 ${attrs.length}`)

    writeFileSync(PROGRESS_FILE, JSON.stringify({
      done:        [...doneSet],
      cities:      CITIES,          // 固定城市列表，每次都写入方便 build 脚本使用
      attractions: allAttractions,
    }, null, 2))
  }

  // 最终去重
  const seen  = new Set()
  const dedup = allAttractions.filter(a => {
    const k = `${a.name}|${a.lat.toFixed(3)},${a.lng.toFixed(3)}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })

  writeFileSync(RAW_FILE, JSON.stringify({ cities: CITIES, attractions: dedup }, null, 2))
  console.log(`\n✅ 完成！城市 ${CITIES.length}，景点 ${dedup.length}`)
  console.log(`   → ${RAW_FILE}`)
  console.log(`\n下一步: node scripts/build-geo-ts.mjs`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
