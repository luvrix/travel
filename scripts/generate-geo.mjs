#!/usr/bin/env node
// Generate comprehensive Chinese geo data by combining city coordinates with attraction data

import { writeFileSync } from 'fs'
import { pinyin } from 'pinyin-pro'

// All Chinese prefecture-level cities with real coordinates
const CITIES = [
  // 华北 - 北京
  { name: '北京', lat: 39.9042, lng: 116.4074, province: '北京' },
  { name: '天津', lat: 39.3434, lng: 117.3616, province: '天津' },
  // 河北
  { name: '石家庄', lat: 38.0428, lng: 114.5149, province: '河北' },
  { name: '唐山', lat: 39.6307, lng: 118.1802, province: '河北' },
  { name: '保定', lat: 38.8663, lng: 115.4986, province: '河北' },
  { name: '秦皇岛', lat: 39.9356, lng: 119.5996, province: '河北' },
  { name: '邯郸', lat: 36.6256, lng: 114.5389, province: '河北' },
  { name: '邢台', lat: 37.0682, lng: 114.5043, province: '河北' },
  { name: '张家口', lat: 40.8244, lng: 114.8844, province: '河北' },
  { name: '承德', lat: 40.9516, lng: 117.9635, province: '河北' },
  { name: '沧州', lat: 38.3045, lng: 116.8388, province: '河北' },
  { name: '廊坊', lat: 39.5380, lng: 116.7036, province: '河北' },
  { name: '衡水', lat: 37.7394, lng: 115.6706, province: '河北' },
  // 山西
  { name: '太原', lat: 37.8706, lng: 112.5489, province: '山西' },
  { name: '大同', lat: 40.0770, lng: 113.3000, province: '山西' },
  { name: '临汾', lat: 36.0880, lng: 111.5190, province: '山西' },
  { name: '运城', lat: 35.0224, lng: 111.0038, province: '山西' },
  { name: '晋中', lat: 37.6867, lng: 112.7526, province: '山西' },
  { name: '长治', lat: 36.1954, lng: 113.1166, province: '山西' },
  { name: '晋城', lat: 35.4906, lng: 112.8516, province: '山西' },
  { name: '忻州', lat: 38.4181, lng: 112.7337, province: '山西' },
  { name: '朔州', lat: 39.3317, lng: 112.4328, province: '山西' },
  { name: '阳泉', lat: 37.8581, lng: 113.5800, province: '山西' },
  { name: '吕梁', lat: 37.5185, lng: 111.1441, province: '山西' },
  // 内蒙古
  { name: '呼和浩特', lat: 40.8427, lng: 111.7490, province: '内蒙古' },
  { name: '包头', lat: 40.6567, lng: 109.8401, province: '内蒙古' },
  { name: '鄂尔多斯', lat: 39.6086, lng: 109.7813, province: '内蒙古' },
  { name: '赤峰', lat: 42.2589, lng: 118.8890, province: '内蒙古' },
  { name: '呼伦贝尔', lat: 49.2124, lng: 119.7654, province: '内蒙古' },
  { name: '通辽', lat: 43.6025, lng: 122.2574, province: '内蒙古' },
  { name: '乌兰察布', lat: 40.9942, lng: 113.1140, province: '内蒙古' },
  { name: '巴彦淖尔', lat: 40.7539, lng: 107.3880, province: '内蒙古' },
  { name: '乌海', lat: 39.6555, lng: 106.7945, province: '内蒙古' },
  { name: '锡林郭勒', lat: 43.9333, lng: 116.0833, province: '内蒙古' },
  { name: '兴安盟', lat: 46.0767, lng: 122.0442, province: '内蒙古' },
  { name: '阿拉善', lat: 38.8440, lng: 105.7293, province: '内蒙古' },

  // 东北 - 辽宁
  { name: '沈阳', lat: 41.8057, lng: 123.4315, province: '辽宁' },
  { name: '大连', lat: 38.9140, lng: 121.6147, province: '辽宁' },
  { name: '鞍山', lat: 41.1073, lng: 122.9960, province: '辽宁' },
  { name: '抚顺', lat: 41.8799, lng: 123.9573, province: '辽宁' },
  { name: '本溪', lat: 41.2919, lng: 123.7690, province: '辽宁' },
  { name: '丹东', lat: 40.1288, lng: 124.3949, province: '辽宁' },
  { name: '锦州', lat: 41.0953, lng: 121.1269, province: '辽宁' },
  { name: '营口', lat: 40.6665, lng: 122.2352, province: '辽宁' },
  { name: '阜新', lat: 42.0214, lng: 121.6690, province: '辽宁' },
  { name: '辽阳', lat: 41.2690, lng: 123.2354, province: '辽宁' },
  { name: '盘锦', lat: 41.1247, lng: 122.0668, province: '辽宁' },
  { name: '铁岭', lat: 42.2990, lng: 123.8442, province: '辽宁' },
  { name: '朝阳', lat: 41.5676, lng: 120.4514, province: '辽宁' },
  { name: '葫芦岛', lat: 40.7110, lng: 120.8370, province: '辽宁' },
  // 吉林
  { name: '长春', lat: 43.8171, lng: 125.3235, province: '吉林' },
  { name: '吉林市', lat: 43.8378, lng: 126.5496, province: '吉林' },
  { name: '四平', lat: 43.1664, lng: 124.3514, province: '吉林' },
  { name: '辽源', lat: 42.9023, lng: 125.1434, province: '吉林' },
  { name: '通化', lat: 41.7284, lng: 125.9395, province: '吉林' },
  { name: '白山', lat: 41.9422, lng: 126.4237, province: '吉林' },
  { name: '松原', lat: 45.1350, lng: 124.8238, province: '吉林' },
  { name: '白城', lat: 45.6197, lng: 122.8387, province: '吉林' },
  { name: '延边', lat: 42.9046, lng: 129.5113, province: '吉林' },
  // 黑龙江
  { name: '哈尔滨', lat: 45.8038, lng: 126.5348, province: '黑龙江' },
  { name: '齐齐哈尔', lat: 47.3409, lng: 123.9184, province: '黑龙江' },
  { name: '牡丹江', lat: 44.5523, lng: 129.6328, province: '黑龙江' },
  { name: '佳木斯', lat: 46.7993, lng: 130.3192, province: '黑龙江' },
  { name: '大庆', lat: 46.5975, lng: 125.1131, province: '黑龙江' },
  { name: '鸡西', lat: 45.3000, lng: 130.9697, province: '黑龙江' },
  { name: '双鸭山', lat: 46.6431, lng: 131.1589, province: '黑龙江' },
  { name: '伊春', lat: 47.7248, lng: 128.8996, province: '黑龙江' },
  { name: '七台河', lat: 45.7707, lng: 131.0000, province: '黑龙江' },
  { name: '鹤岗', lat: 47.3509, lng: 130.2985, province: '黑龙江' },
  { name: '绥化', lat: 46.6527, lng: 126.9688, province: '黑龙江' },
  { name: '黑河', lat: 50.2455, lng: 127.5284, province: '黑龙江' },
  { name: '大兴安岭', lat: 51.7191, lng: 124.1200, province: '黑龙江' },

  // 华东 - 上海
  { name: '上海', lat: 31.2304, lng: 121.4737, province: '上海' },
  // 江苏
  { name: '南京', lat: 32.0603, lng: 118.7969, province: '江苏' },
  { name: '苏州', lat: 31.2990, lng: 120.5853, province: '江苏' },
  { name: '无锡', lat: 31.4912, lng: 120.3119, province: '江苏' },
  { name: '常州', lat: 31.8106, lng: 119.9741, province: '江苏' },
  { name: '镇江', lat: 32.1882, lng: 119.4252, province: '江苏' },
  { name: '扬州', lat: 32.3942, lng: 119.4126, province: '江苏' },
  { name: '泰州', lat: 32.4553, lng: 119.9232, province: '江苏' },
  { name: '南通', lat: 32.0146, lng: 120.8647, province: '江苏' },
  { name: '盐城', lat: 33.3478, lng: 120.1615, province: '江苏' },
  { name: '淮安', lat: 33.5514, lng: 119.0130, province: '江苏' },
  { name: '连云港', lat: 34.5968, lng: 119.2217, province: '江苏' },
  { name: '徐州', lat: 34.2618, lng: 117.1847, province: '江苏' },
  { name: '宿迁', lat: 33.9631, lng: 118.2757, province: '江苏' },
  // 浙江
  { name: '杭州', lat: 30.2741, lng: 120.1551, province: '浙江' },
  { name: '宁波', lat: 29.8683, lng: 121.5440, province: '浙江' },
  { name: '温州', lat: 28.0016, lng: 120.6722, province: '浙江' },
  { name: '绍兴', lat: 30.0000, lng: 120.5833, province: '浙江' },
  { name: '嘉兴', lat: 30.7469, lng: 120.7555, province: '浙江' },
  { name: '湖州', lat: 30.8941, lng: 120.0868, province: '浙江' },
  { name: '金华', lat: 29.0785, lng: 119.6494, province: '浙江' },
  { name: '台州', lat: 28.6563, lng: 121.4208, province: '浙江' },
  { name: '衢州', lat: 28.9353, lng: 118.8591, province: '浙江' },
  { name: '丽水', lat: 28.4672, lng: 119.9229, province: '浙江' },
  { name: '舟山', lat: 30.0360, lng: 122.1069, province: '浙江' },
  // 安徽
  { name: '合肥', lat: 31.8206, lng: 117.2272, province: '安徽' },
  { name: '芜湖', lat: 31.3346, lng: 118.4325, province: '安徽' },
  { name: '蚌埠', lat: 32.9168, lng: 117.3894, province: '安徽' },
  { name: '黄山', lat: 29.7147, lng: 118.3376, province: '安徽' },
  { name: '安庆', lat: 30.5430, lng: 117.0631, province: '安徽' },
  { name: '马鞍山', lat: 31.6705, lng: 118.5068, province: '安徽' },
  { name: '滁州', lat: 32.3018, lng: 118.3170, province: '安徽' },
  { name: '阜阳', lat: 32.8908, lng: 115.8142, province: '安徽' },
  { name: '宿州', lat: 33.6461, lng: 116.9641, province: '安徽' },
  { name: '六安', lat: 31.7350, lng: 116.5231, province: '安徽' },
  { name: '亳州', lat: 33.8693, lng: 115.7785, province: '安徽' },
  { name: '淮南', lat: 32.6264, lng: 116.9998, province: '安徽' },
  { name: '淮北', lat: 33.9717, lng: 116.7945, province: '安徽' },
  { name: '铜陵', lat: 30.9446, lng: 117.8122, province: '安徽' },
  { name: '池州', lat: 30.6648, lng: 117.4912, province: '安徽' },
  { name: '宣城', lat: 30.9457, lng: 118.7590, province: '安徽' },
  // 福建
  { name: '福州', lat: 26.0745, lng: 119.2965, province: '福建' },
  { name: '厦门', lat: 24.4798, lng: 118.0894, province: '福建' },
  { name: '泉州', lat: 24.8741, lng: 118.6758, province: '福建' },
  { name: '漳州', lat: 24.5128, lng: 117.6471, province: '福建' },
  { name: '莆田', lat: 25.4309, lng: 119.0078, province: '福建' },
  { name: '龙岩', lat: 25.0755, lng: 117.0174, province: '福建' },
  { name: '三明', lat: 26.2654, lng: 117.6389, province: '福建' },
  { name: '南平', lat: 26.6418, lng: 118.1778, province: '福建' },
  { name: '宁德', lat: 26.6566, lng: 119.5479, province: '福建' },
  // 江西
  { name: '南昌', lat: 28.6820, lng: 115.8579, province: '江西' },
  { name: '九江', lat: 29.7050, lng: 116.0019, province: '江西' },
  { name: '景德镇', lat: 29.2687, lng: 117.1784, province: '江西' },
  { name: '萍乡', lat: 27.6229, lng: 113.8546, province: '江西' },
  { name: '新余', lat: 27.8175, lng: 114.9173, province: '江西' },
  { name: '鹰潭', lat: 28.2386, lng: 117.0692, province: '江西' },
  { name: '赣州', lat: 25.8314, lng: 114.9334, province: '江西' },
  { name: '吉安', lat: 27.1138, lng: 114.9864, province: '江西' },
  { name: '宜春', lat: 27.8043, lng: 114.4161, province: '江西' },
  { name: '抚州', lat: 27.9538, lng: 116.3583, province: '江西' },
  { name: '上饶', lat: 28.4553, lng: 117.9433, province: '江西' },
  // 山东
  { name: '济南', lat: 36.6512, lng: 116.9972, province: '山东' },
  { name: '青岛', lat: 36.0671, lng: 120.3826, province: '山东' },
  { name: '烟台', lat: 37.4638, lng: 121.4479, province: '山东' },
  { name: '威海', lat: 37.5131, lng: 122.1200, province: '山东' },
  { name: '潍坊', lat: 36.7069, lng: 119.1619, province: '山东' },
  { name: '淄博', lat: 36.8131, lng: 118.0548, province: '山东' },
  { name: '临沂', lat: 35.1041, lng: 118.3564, province: '山东' },
  { name: '济宁', lat: 35.4144, lng: 116.5873, province: '山东' },
  { name: '泰安', lat: 36.2001, lng: 117.0870, province: '山东' },
  { name: '日照', lat: 35.4164, lng: 119.5269, province: '山东' },
  { name: '德州', lat: 37.4360, lng: 116.3575, province: '山东' },
  { name: '聊城', lat: 36.4558, lng: 115.9854, province: '山东' },
  { name: '滨州', lat: 37.3826, lng: 117.9714, province: '山东' },
  { name: '东营', lat: 37.4336, lng: 118.6749, province: '山东' },
  { name: '枣庄', lat: 34.8105, lng: 117.3237, province: '山东' },
  { name: '菏泽', lat: 35.2328, lng: 115.4810, province: '山东' },

  // 华中 - 河南
  { name: '郑州', lat: 34.7466, lng: 113.6254, province: '河南' },
  { name: '洛阳', lat: 34.6197, lng: 112.4540, province: '河南' },
  { name: '开封', lat: 34.7972, lng: 114.3416, province: '河南' },
  { name: '南阳', lat: 33.0042, lng: 112.5283, province: '河南' },
  { name: '安阳', lat: 36.0998, lng: 114.3931, province: '河南' },
  { name: '新乡', lat: 35.3030, lng: 113.8835, province: '河南' },
  { name: '许昌', lat: 34.0357, lng: 113.8523, province: '河南' },
  { name: '平顶山', lat: 33.7662, lng: 113.1924, province: '河南' },
  { name: '信阳', lat: 32.1264, lng: 114.0913, province: '河南' },
  { name: '焦作', lat: 35.2340, lng: 113.2418, province: '河南' },
  { name: '周口', lat: 33.6259, lng: 114.6965, province: '河南' },
  { name: '驻马店', lat: 32.9802, lng: 114.0228, province: '河南' },
  { name: '商丘', lat: 34.4142, lng: 115.6562, province: '河南' },
  { name: '三门峡', lat: 34.7734, lng: 111.2005, province: '河南' },
  { name: '漯河', lat: 33.5817, lng: 114.0166, province: '河南' },
  { name: '濮阳', lat: 35.7626, lng: 115.0296, province: '河南' },
  { name: '鹤壁', lat: 35.7475, lng: 114.2974, province: '河南' },
  { name: '济源', lat: 35.0672, lng: 112.6021, province: '河南' },
  // 湖北
  { name: '武汉', lat: 30.5928, lng: 114.3055, province: '湖北' },
  { name: '宜昌', lat: 30.6918, lng: 111.2864, province: '湖北' },
  { name: '襄阳', lat: 32.0090, lng: 112.1228, province: '湖北' },
  { name: '荆州', lat: 30.3263, lng: 112.2390, province: '湖北' },
  { name: '十堰', lat: 32.6292, lng: 110.7980, province: '湖北' },
  { name: '黄冈', lat: 30.4539, lng: 114.8724, province: '湖北' },
  { name: '孝感', lat: 30.9244, lng: 113.9268, province: '湖北' },
  { name: '荆门', lat: 31.0354, lng: 112.1993, province: '湖北' },
  { name: '咸宁', lat: 29.8413, lng: 114.3224, province: '湖北' },
  { name: '黄石', lat: 30.1991, lng: 115.0386, province: '湖北' },
  { name: '鄂州', lat: 30.3905, lng: 114.8949, province: '湖北' },
  { name: '随州', lat: 31.6901, lng: 113.3826, province: '湖北' },
  { name: '恩施', lat: 30.2720, lng: 109.4880, province: '湖北' },
  // 湖南
  { name: '长沙', lat: 28.2282, lng: 112.9388, province: '湖南' },
  { name: '株洲', lat: 27.8274, lng: 113.1340, province: '湖南' },
  { name: '湘潭', lat: 27.8298, lng: 112.9442, province: '湖南' },
  { name: '衡阳', lat: 26.8936, lng: 112.5720, province: '湖南' },
  { name: '岳阳', lat: 29.3561, lng: 113.1289, province: '湖南' },
  { name: '常德', lat: 29.0318, lng: 111.6986, province: '湖南' },
  { name: '张家界', lat: 29.1171, lng: 110.4793, province: '湖南' },
  { name: '益阳', lat: 28.5538, lng: 112.3554, province: '湖南' },
  { name: '郴州', lat: 25.7706, lng: 113.0147, province: '湖南' },
  { name: '永州', lat: 26.4345, lng: 111.6133, province: '湖南' },
  { name: '怀化', lat: 27.5501, lng: 109.9972, province: '湖南' },
  { name: '娄底', lat: 27.7006, lng: 111.9944, province: '湖南' },
  { name: '湘西', lat: 28.3119, lng: 109.7392, province: '湖南' },
  { name: '邵阳', lat: 27.2387, lng: 111.4683, province: '湖南' },

  // 华南 - 广东
  { name: '广州', lat: 23.1291, lng: 113.2644, province: '广东' },
  { name: '深圳', lat: 22.5431, lng: 114.0579, province: '广东' },
  { name: '珠海', lat: 22.2710, lng: 113.5767, province: '广东' },
  { name: '佛山', lat: 23.0218, lng: 113.1218, province: '广东' },
  { name: '东莞', lat: 23.0208, lng: 113.7518, province: '广东' },
  { name: '中山', lat: 22.5176, lng: 113.3929, province: '广东' },
  { name: '惠州', lat: 23.1116, lng: 114.4161, province: '广东' },
  { name: '汕头', lat: 23.3535, lng: 116.6818, province: '广东' },
  { name: '江门', lat: 22.5789, lng: 113.0815, province: '广东' },
  { name: '湛江', lat: 21.2707, lng: 110.3594, province: '广东' },
  { name: '肇庆', lat: 23.0470, lng: 112.4652, province: '广东' },
  { name: '梅州', lat: 24.2884, lng: 116.1228, province: '广东' },
  { name: '茂名', lat: 21.6627, lng: 110.9255, province: '广东' },
  { name: '韶关', lat: 24.8107, lng: 113.5975, province: '广东' },
  { name: '清远', lat: 23.6817, lng: 113.0560, province: '广东' },
  { name: '潮州', lat: 23.6567, lng: 116.6227, province: '广东' },
  { name: '揭阳', lat: 23.5500, lng: 116.3727, province: '广东' },
  { name: '河源', lat: 23.7432, lng: 114.6978, province: '广东' },
  { name: '阳江', lat: 21.8580, lng: 111.9822, province: '广东' },
  { name: '汕尾', lat: 22.7862, lng: 115.3753, province: '广东' },
  { name: '云浮', lat: 22.9151, lng: 112.0444, province: '广东' },
  // 广西
  { name: '南宁', lat: 22.8170, lng: 108.3665, province: '广西' },
  { name: '桂林', lat: 25.2742, lng: 110.2990, province: '广西' },
  { name: '柳州', lat: 24.3260, lng: 109.4116, province: '广西' },
  { name: '北海', lat: 21.4733, lng: 109.1198, province: '广西' },
  { name: '梧州', lat: 23.4770, lng: 111.2791, province: '广西' },
  { name: '玉林', lat: 22.6541, lng: 110.1540, province: '广西' },
  { name: '百色', lat: 23.9026, lng: 106.6180, province: '广西' },
  { name: '河池', lat: 24.6926, lng: 108.0854, province: '广西' },
  { name: '钦州', lat: 21.9813, lng: 108.6543, province: '广西' },
  { name: '防城港', lat: 21.6146, lng: 108.3545, province: '广西' },
  { name: '贵港', lat: 23.1114, lng: 109.5982, province: '广西' },
  { name: '贺州', lat: 24.4033, lng: 111.5527, province: '广西' },
  { name: '来宾', lat: 23.7505, lng: 109.2214, province: '广西' },
  { name: '崇左', lat: 22.3765, lng: 107.3643, province: '广西' },
  // 海南
  { name: '海口', lat: 20.0444, lng: 110.1999, province: '海南' },
  { name: '三亚', lat: 18.2528, lng: 109.5020, province: '海南' },
  { name: '儋州', lat: 19.5175, lng: 109.5768, province: '海南' },
  { name: '琼海', lat: 19.2581, lng: 110.4745, province: '海南' },
  { name: '万宁', lat: 18.7953, lng: 110.3894, province: '海南' },
  { name: '文昌', lat: 19.5432, lng: 110.7536, province: '海南' },
  { name: '五指山', lat: 18.7751, lng: 109.5170, province: '海南' },

  // 西南 - 重庆
  { name: '重庆', lat: 29.5630, lng: 106.5516, province: '重庆' },
  // 四川
  { name: '成都', lat: 30.5728, lng: 104.0668, province: '四川' },
  { name: '绵阳', lat: 31.4679, lng: 104.6796, province: '四川' },
  { name: '乐山', lat: 29.5521, lng: 103.7660, province: '四川' },
  { name: '宜宾', lat: 28.7513, lng: 104.6417, province: '四川' },
  { name: '泸州', lat: 28.8717, lng: 105.4423, province: '四川' },
  { name: '南充', lat: 30.8373, lng: 106.1107, province: '四川' },
  { name: '达州', lat: 31.2090, lng: 107.4682, province: '四川' },
  { name: '广安', lat: 30.4741, lng: 106.6333, province: '四川' },
  { name: '遂宁', lat: 30.5333, lng: 105.5928, province: '四川' },
  { name: '内江', lat: 29.5800, lng: 105.0586, province: '四川' },
  { name: '自贡', lat: 29.3393, lng: 104.7784, province: '四川' },
  { name: '德阳', lat: 31.1270, lng: 104.3981, province: '四川' },
  { name: '眉山', lat: 30.0757, lng: 103.8318, province: '四川' },
  { name: '资阳', lat: 30.1222, lng: 104.6279, province: '四川' },
  { name: '雅安', lat: 29.9800, lng: 103.0010, province: '四川' },
  { name: '广元', lat: 32.4353, lng: 105.8430, province: '四川' },
  { name: '攀枝花', lat: 26.5823, lng: 101.7188, province: '四川' },
  { name: '巴中', lat: 31.8691, lng: 106.7478, province: '四川' },
  { name: '阿坝', lat: 31.8990, lng: 102.2214, province: '四川' },
  { name: '甘孜', lat: 30.0486, lng: 101.9625, province: '四川' },
  { name: '凉山', lat: 27.8868, lng: 102.2645, province: '四川' },
  // 贵州
  { name: '贵阳', lat: 26.6470, lng: 106.6302, province: '贵州' },
  { name: '遵义', lat: 27.7254, lng: 106.9273, province: '贵州' },
  { name: '安顺', lat: 26.2456, lng: 105.9462, province: '贵州' },
  { name: '六盘水', lat: 26.5948, lng: 104.8333, province: '贵州' },
  { name: '毕节', lat: 27.3019, lng: 105.2847, province: '贵州' },
  { name: '铜仁', lat: 27.7183, lng: 109.1896, province: '贵州' },
  { name: '黔东南', lat: 26.5835, lng: 107.9829, province: '贵州' },
  { name: '黔南', lat: 26.2582, lng: 107.5170, province: '贵州' },
  { name: '黔西南', lat: 25.0880, lng: 104.9063, province: '贵州' },
  // 云南
  { name: '昆明', lat: 25.0389, lng: 102.7183, province: '云南' },
  { name: '大理', lat: 25.6065, lng: 100.2676, province: '云南' },
  { name: '丽江', lat: 26.8721, lng: 100.2299, province: '云南' },
  { name: '西双版纳', lat: 22.0074, lng: 100.7971, province: '云南' },
  { name: '曲靖', lat: 25.4900, lng: 103.7961, province: '云南' },
  { name: '玉溪', lat: 24.3518, lng: 102.5457, province: '云南' },
  { name: '保山', lat: 25.1120, lng: 99.1671, province: '云南' },
  { name: '昭通', lat: 27.3400, lng: 103.7250, province: '云南' },
  { name: '普洱', lat: 22.8252, lng: 100.9660, province: '云南' },
  { name: '临沧', lat: 23.8866, lng: 100.0927, province: '云南' },
  { name: '楚雄', lat: 25.0292, lng: 101.5280, province: '云南' },
  { name: '红河', lat: 23.3640, lng: 103.3756, province: '云南' },
  { name: '文山', lat: 23.3693, lng: 104.2446, province: '云南' },
  { name: '德宏', lat: 24.4367, lng: 98.5854, province: '云南' },
  { name: '迪庆', lat: 27.8190, lng: 99.7064, province: '云南' },
  { name: '怒江', lat: 25.8170, lng: 98.8543, province: '云南' },
  // 西藏
  { name: '拉萨', lat: 29.6500, lng: 91.1000, province: '西藏' },
  { name: '日喀则', lat: 29.2671, lng: 88.8808, province: '西藏' },
  { name: '林芝', lat: 29.6491, lng: 94.3615, province: '西藏' },
  { name: '山南', lat: 29.2360, lng: 91.7730, province: '西藏' },
  { name: '昌都', lat: 31.1369, lng: 97.1787, province: '西藏' },
  { name: '那曲', lat: 31.4762, lng: 92.0513, province: '西藏' },
  { name: '阿里', lat: 32.5011, lng: 80.1055, province: '西藏' },

  // 西北 - 陕西
  { name: '西安', lat: 34.3416, lng: 108.9398, province: '陕西' },
  { name: '咸阳', lat: 34.3296, lng: 108.7089, province: '陕西' },
  { name: '宝鸡', lat: 34.3617, lng: 107.2370, province: '陕西' },
  { name: '渭南', lat: 34.4998, lng: 109.5098, province: '陕西' },
  { name: '汉中', lat: 33.0674, lng: 107.0230, province: '陕西' },
  { name: '延安', lat: 36.5853, lng: 109.4898, province: '陕西' },
  { name: '榆林', lat: 38.2854, lng: 109.7348, province: '陕西' },
  { name: '安康', lat: 32.6900, lng: 109.0293, province: '陕西' },
  { name: '商洛', lat: 33.8700, lng: 109.9400, province: '陕西' },
  { name: '铜川', lat: 34.8966, lng: 108.9451, province: '陕西' },
  // 甘肃
  { name: '兰州', lat: 36.0611, lng: 103.8343, province: '甘肃' },
  { name: '天水', lat: 34.5809, lng: 105.7249, province: '甘肃' },
  { name: '酒泉', lat: 39.7321, lng: 98.4941, province: '甘肃' },
  { name: '嘉峪关', lat: 39.7732, lng: 98.2892, province: '甘肃' },
  { name: '张掖', lat: 38.9262, lng: 100.4495, province: '甘肃' },
  { name: '武威', lat: 37.9283, lng: 102.6346, province: '甘肃' },
  { name: '定西', lat: 35.5806, lng: 104.6265, province: '甘肃' },
  { name: '陇南', lat: 33.3886, lng: 104.9217, province: '甘肃' },
  { name: '庆阳', lat: 35.7341, lng: 107.6380, province: '甘肃' },
  { name: '平凉', lat: 35.5428, lng: 106.6652, province: '甘肃' },
  { name: '白银', lat: 36.5448, lng: 104.1389, province: '甘肃' },
  { name: '金昌', lat: 38.5160, lng: 102.1878, province: '甘肃' },
  { name: '临夏', lat: 35.6012, lng: 103.2106, province: '甘肃' },
  { name: '甘南', lat: 34.9864, lng: 102.9109, province: '甘肃' },
  // 青海
  { name: '西宁', lat: 36.6171, lng: 101.7782, province: '青海' },
  { name: '海东', lat: 36.5029, lng: 102.1028, province: '青海' },
  { name: '海北', lat: 36.9541, lng: 100.9010, province: '青海' },
  { name: '海南', lat: 36.2864, lng: 100.6198, province: '青海' },
  { name: '黄南', lat: 35.5177, lng: 102.0153, province: '青海' },
  { name: '果洛', lat: 34.4804, lng: 100.2447, province: '青海' },
  { name: '玉树', lat: 33.0043, lng: 97.0069, province: '青海' },
  { name: '海西', lat: 37.3737, lng: 97.3708, province: '青海' },
  // 宁夏
  { name: '银川', lat: 38.4872, lng: 106.2309, province: '宁夏' },
  { name: '石嘴山', lat: 39.0133, lng: 106.3762, province: '宁夏' },
  { name: '吴忠', lat: 37.9862, lng: 106.1991, province: '宁夏' },
  { name: '固原', lat: 36.0160, lng: 106.2425, province: '宁夏' },
  { name: '中卫', lat: 37.5149, lng: 105.1966, province: '宁夏' },
  // 新疆
  { name: '乌鲁木齐', lat: 43.8256, lng: 87.6168, province: '新疆' },
  { name: '吐鲁番', lat: 42.9513, lng: 89.1898, province: '新疆' },
  { name: '喀什', lat: 39.4677, lng: 75.9891, province: '新疆' },
  { name: '伊犁', lat: 43.9190, lng: 81.3244, province: '新疆' },
  { name: '阿勒泰', lat: 47.8484, lng: 88.1396, province: '新疆' },
  { name: '昌吉', lat: 44.0145, lng: 87.3082, province: '新疆' },
  { name: '哈密', lat: 42.8332, lng: 93.5151, province: '新疆' },
  { name: '阿克苏', lat: 41.1673, lng: 80.2610, province: '新疆' },
  { name: '和田', lat: 37.1104, lng: 79.9267, province: '新疆' },
  { name: '克拉玛依', lat: 45.5798, lng: 84.8893, province: '新疆' },
  { name: '巴音郭楞', lat: 41.7689, lng: 86.1510, province: '新疆' },
  { name: '塔城', lat: 46.7453, lng: 82.9857, province: '新疆' },
  { name: '博尔塔拉', lat: 44.9052, lng: 82.0748, province: '新疆' },
  { name: '克孜勒苏', lat: 39.7142, lng: 76.1677, province: '新疆' },
  // 港澳台
  { name: '香港', lat: 22.3193, lng: 114.1694, province: '香港' },
  { name: '澳门', lat: 22.1987, lng: 113.5439, province: '澳门' },
  { name: '台北', lat: 25.0330, lng: 121.5654, province: '台湾' },
  { name: '台南', lat: 22.9999, lng: 120.2269, province: '台湾' },
  { name: '台中', lat: 24.1477, lng: 120.6736, province: '台湾' },
  { name: '高雄', lat: 22.6273, lng: 120.3014, province: '台湾' },
  { name: '花莲', lat: 23.9871, lng: 121.6016, province: '台湾' },
  { name: '阿里山', lat: 23.5111, lng: 120.8128, province: '台湾' },
]

// Major attractions organized by city - real coordinates
const ATTRACTIONS = {
  '北京': [
    { name: '故宫博物院', aliases: ['故宫', '紫禁城'], lat: 39.9163, lng: 116.3972, category: 'attraction' },
    { name: '天安门广场', aliases: ['天安门'], lat: 39.9054, lng: 116.3976, category: 'attraction' },
    { name: '颐和园', lat: 39.9999, lng: 116.2755, category: 'attraction' },
    { name: '八达岭长城', aliases: ['长城', '八达岭'], lat: 40.3588, lng: 116.0204, category: 'attraction' },
    { name: '天坛公园', aliases: ['天坛'], lat: 39.8822, lng: 116.4066, category: 'attraction' },
    { name: '圆明园', lat: 40.0092, lng: 116.2982, category: 'attraction' },
    { name: '鸟巢', aliases: ['国家体育场'], lat: 39.9929, lng: 116.3966, category: 'attraction' },
    { name: '南锣鼓巷', aliases: ['南锣'], lat: 39.9371, lng: 116.4029, category: 'district' },
    { name: '景山公园', aliases: ['景山'], lat: 39.9242, lng: 116.3966, category: 'attraction' },
    { name: '什刹海', lat: 39.9403, lng: 116.3847, category: 'district' },
    { name: '明十三陵', aliases: ['十三陵'], lat: 40.2520, lng: 116.2280, category: 'attraction' },
    { name: '北海公园', aliases: ['北海'], lat: 39.9248, lng: 116.3905, category: 'attraction' },
    { name: '798艺术区', aliases: ['798'], lat: 39.9837, lng: 116.4957, category: 'district' },
    { name: '香山公园', aliases: ['香山'], lat: 40.0000, lng: 116.1964, category: 'attraction' },
  ],
  '天津': [
    { name: '天津古文化街', aliases: ['古文化街'], lat: 39.1390, lng: 117.1799, category: 'attraction' },
    { name: '天津之眼', aliases: ['永乐桥摩天轮'], lat: 39.1411, lng: 117.1712, category: 'attraction' },
    { name: '五大道', lat: 39.1097, lng: 117.2017, category: 'district' },
    { name: '意式风情区', aliases: ['意风区'], lat: 39.1479, lng: 117.1982, category: 'district' },
    { name: '盘山风景区', aliases: ['盘山'], lat: 40.0547, lng: 117.4498, category: 'attraction' },
  ],
  '石家庄': [
    { name: '赵州桥', aliases: ['安济桥'], lat: 37.8972, lng: 114.8183, category: 'attraction' },
    { name: '西柏坡', lat: 38.6167, lng: 113.9667, category: 'attraction' },
    { name: '正定古城', aliases: ['正定'], lat: 38.1467, lng: 114.5799, category: 'attraction' },
  ],
  '唐山': [
    { name: '清东陵', lat: 40.1833, lng: 117.6500, category: 'attraction' },
    { name: '南湖公园', lat: 39.6003, lng: 118.1767, category: 'attraction' },
  ],
  '保定': [
    { name: '白洋淀', lat: 38.9024, lng: 115.9658, category: 'attraction' },
    { name: '清西陵', lat: 39.3499, lng: 115.2665, category: 'attraction' },
    { name: '野三坡', lat: 39.6167, lng: 115.5000, category: 'attraction' },
  ],
  '秦皇岛': [
    { name: '山海关', aliases: ['天下第一关'], lat: 40.0030, lng: 119.7552, category: 'attraction' },
    { name: '北戴河', lat: 39.8084, lng: 119.4819, category: 'attraction' },
    { name: '老龙头', lat: 39.9544, lng: 119.7867, category: 'attraction' },
  ],
  '邯郸': [
    { name: '响堂山石窟', lat: 36.5292, lng: 114.1406, category: 'attraction' },
    { name: '娲皇宫', lat: 36.5300, lng: 113.8700, category: 'attraction' },
  ],
  '承德': [
    { name: '避暑山庄', aliases: ['承德避暑山庄', '热河行宫'], lat: 40.9960, lng: 117.9401, category: 'attraction' },
    { name: '金山岭长城', lat: 40.6793, lng: 117.2428, category: 'attraction' },
    { name: '木兰围场', lat: 41.9263, lng: 117.7505, category: 'attraction' },
  ],
  '张家口': [
    { name: '崇礼滑雪场', aliases: ['崇礼'], lat: 40.9667, lng: 115.2833, category: 'attraction' },
    { name: '草原天路', lat: 41.1577, lng: 114.7186, category: 'attraction' },
  ],
  '太原': [
    { name: '晋祠', aliases: ['晋祠博物馆'], lat: 37.7082, lng: 112.4340, category: 'attraction' },
    { name: '山西博物院', lat: 37.8701, lng: 112.5311, category: 'attraction' },
    { name: '天龙山石窟', lat: 37.7300, lng: 112.5000, category: 'attraction' },
  ],
  '大同': [
    { name: '云冈石窟', lat: 40.1102, lng: 113.1319, category: 'attraction' },
    { name: '悬空寺', lat: 39.6671, lng: 113.7342, category: 'attraction' },
    { name: '华严寺', lat: 40.0748, lng: 113.2944, category: 'attraction' },
  ],
  '临汾': [
    { name: '壶口瀑布', lat: 36.1407, lng: 110.4437, category: 'attraction' },
    { name: '尧庙', lat: 36.0680, lng: 111.5230, category: 'attraction' },
  ],
  '运城': [
    { name: '解州关帝庙', aliases: ['关帝庙'], lat: 35.0466, lng: 110.8494, category: 'attraction' },
    { name: '鹳雀楼', lat: 34.8289, lng: 110.6053, category: 'attraction' },
    { name: '运城盐湖', lat: 34.9892, lng: 110.9997, category: 'attraction' },
  ],
  '晋中': [
    { name: '平遥古城', aliases: ['平遥'], lat: 37.1897, lng: 112.1751, category: 'attraction' },
    { name: '乔家大院', lat: 37.5364, lng: 112.5086, category: 'attraction' },
    { name: '王家大院', lat: 37.1889, lng: 111.7944, category: 'attraction' },
  ],
  '忻州': [
    { name: '五台山', lat: 38.9804, lng: 113.5769, category: 'attraction' },
    { name: '雁门关', lat: 39.1975, lng: 112.6706, category: 'attraction' },
  ],
  '朔州': [
    { name: '应县木塔', aliases: ['佛宫寺释迦塔'], lat: 39.5545, lng: 113.1888, category: 'attraction' },
  ],
  '呼和浩特': [
    { name: '大召寺', lat: 40.8075, lng: 111.6483, category: 'attraction' },
    { name: '昭君墓', lat: 40.5543, lng: 111.7067, category: 'attraction' },
    { name: '内蒙古博物院', lat: 40.8326, lng: 111.7532, category: 'attraction' },
  ],
  '鄂尔多斯': [
    { name: '成吉思汗陵', lat: 39.8167, lng: 109.9833, category: 'attraction' },
    { name: '响沙湾', lat: 40.3500, lng: 110.0167, category: 'attraction' },
  ],
  '赤峰': [
    { name: '阿斯哈图石阵', lat: 43.8833, lng: 117.7833, category: 'attraction' },
    { name: '克什克腾草原', lat: 43.2600, lng: 117.5500, category: 'attraction' },
  ],
  '呼伦贝尔': [
    { name: '呼伦湖', lat: 48.9500, lng: 117.3333, category: 'attraction' },
    { name: '额尔古纳湿地', lat: 50.2456, lng: 120.1867, category: 'attraction' },
    { name: '满洲里国门', lat: 49.5981, lng: 117.4540, category: 'attraction' },
  ],
  '通辽': [
    { name: '科尔沁草原', lat: 43.6000, lng: 122.2000, category: 'attraction' },
    { name: '大青沟', lat: 42.8500, lng: 122.1700, category: 'attraction' },
  ],
  '锡林郭勒': [
    { name: '锡林郭勒草原', lat: 44.0000, lng: 116.5000, category: 'attraction' },
    { name: '元上都遗址', lat: 42.3667, lng: 116.1667, category: 'attraction' },
  ],
  '兴安盟': [
    { name: '阿尔山', aliases: ['阿尔山国家森林公园'], lat: 47.1833, lng: 119.9333, category: 'attraction' },
  ],
  '阿拉善': [
    { name: '巴丹吉林沙漠', lat: 39.5000, lng: 102.3333, category: 'attraction' },
    { name: '腾格里沙漠', lat: 38.0000, lng: 104.0000, category: 'attraction' },
  ],
  '沈阳': [
    { name: '沈阳故宫', aliases: ['盛京皇宫'], lat: 41.7919, lng: 123.4476, category: 'attraction' },
    { name: '北陵公园', aliases: ['昭陵'], lat: 41.8747, lng: 123.4333, category: 'attraction' },
    { name: '张氏帅府', aliases: ['大帅府'], lat: 41.7980, lng: 123.4400, category: 'attraction' },
    { name: '东陵公园', aliases: ['清福陵'], lat: 41.8400, lng: 123.5100, category: 'attraction' },
    { name: '沈阳中街', lat: 41.7900, lng: 123.4300, category: 'district' },
    { name: '九一八历史博物馆', lat: 41.8400, lng: 123.4600, category: 'attraction' },
    { name: '棋盘山风景区', lat: 41.9400, lng: 123.5800, category: 'attraction' },
    { name: '沈阳植物园', lat: 41.7800, lng: 123.5300, category: 'attraction' },
  ],
  '大连': [
    { name: '老虎滩海洋公园', aliases: ['老虎滩'], lat: 38.8826, lng: 121.6669, category: 'attraction' },
    { name: '金石滩', lat: 39.0617, lng: 122.0194, category: 'attraction' },
    { name: '星海广场', lat: 38.8741, lng: 121.5969, category: 'attraction' },
    { name: '旅顺口', aliases: ['旅顺'], lat: 38.8333, lng: 121.2333, category: 'attraction' },
  ],
  '丹东': [
    { name: '鸭绿江风景区', aliases: ['鸭绿江'], lat: 40.1288, lng: 124.3949, category: 'attraction' },
    { name: '凤凰山', lat: 40.3500, lng: 124.3500, category: 'attraction' },
    { name: '鸭绿江断桥', aliases: ['断桥'], lat: 40.1250, lng: 124.4083, category: 'attraction' },
  ],
  '本溪': [
    { name: '本溪水洞', lat: 41.1833, lng: 124.0833, category: 'attraction' },
  ],
  '盘锦': [
    { name: '红海滩', lat: 40.9500, lng: 121.9000, category: 'attraction' },
  ],
  '锦州': [
    { name: '笔架山', lat: 40.9050, lng: 121.2556, category: 'attraction' },
    { name: '医巫闾山', lat: 41.6500, lng: 121.5000, category: 'attraction' },
  ],
  '长春': [
    { name: '伪满皇宫博物院', aliases: ['伪满皇宫'], lat: 43.8788, lng: 125.3413, category: 'attraction' },
    { name: '净月潭国家森林公园', aliases: ['净月潭'], lat: 43.7167, lng: 125.4500, category: 'attraction' },
    { name: '长影世纪城', lat: 43.7667, lng: 125.3333, category: 'attraction' },
    { name: '长春世界雕塑公园', lat: 43.8200, lng: 125.3600, category: 'attraction' },
    { name: '南湖公园', lat: 43.8600, lng: 125.3400, category: 'attraction' },
    { name: '万达长白山滑雪场', lat: 41.9000, lng: 128.1000, category: 'attraction' },
    { name: '长春地质宫', lat: 43.8800, lng: 125.3300, category: 'attraction' },
  ],
  '吉林市': [
    { name: '雾凇岛', lat: 43.9667, lng: 126.5500, category: 'attraction' },
    { name: '松花湖', lat: 43.6500, lng: 126.8500, category: 'attraction' },
  ],
  '白山': [
    { name: '长白山天池', aliases: ['天池', '长白山'], lat: 42.0049, lng: 128.0673, category: 'attraction' },
  ],
  '松原': [
    { name: '查干湖', lat: 45.2500, lng: 124.1500, category: 'attraction' },
  ],
  '延边': [
    { name: '防川', lat: 42.3000, lng: 130.6167, category: 'attraction' },
  ],
  '哈尔滨': [
    { name: '圣索菲亚教堂', aliases: ['索菲亚教堂'], lat: 45.7756, lng: 126.6251, category: 'attraction' },
    { name: '中央大街', lat: 45.7783, lng: 126.6333, category: 'district' },
    { name: '冰雪大世界', lat: 45.7833, lng: 126.5167, category: 'attraction' },
    { name: '太阳岛', lat: 45.8333, lng: 126.5333, category: 'attraction' },
    { name: '东北虎林园', lat: 45.7667, lng: 126.6667, category: 'attraction' },
    { name: '哈尔滨冰灯艺术游园', aliases: ['冰灯游园'], lat: 45.7700, lng: 126.6300, category: 'attraction' },
    { name: '中华巴洛克建筑群', lat: 45.7600, lng: 126.6500, category: 'district' },
    { name: '东北烈士纪念馆', lat: 45.7700, lng: 126.6400, category: 'attraction' },
    { name: '哈尔滨极地公园', lat: 45.8000, lng: 126.4900, category: 'attraction' },
    { name: '伏尔加庄园', lat: 45.9600, lng: 126.5700, category: 'attraction' },
  ],
  '牡丹江': [
    { name: '镜泊湖', lat: 43.8833, lng: 128.9167, category: 'attraction' },
    { name: '雪乡', aliases: ['中国雪乡'], lat: 44.2906, lng: 128.8844, category: 'attraction' },
  ],
  '黑河': [
    { name: '五大连池', lat: 48.7500, lng: 126.1167, category: 'attraction' },
  ],
  '大兴安岭': [
    { name: '漠河北极村', aliases: ['北极村', '漠河'], lat: 53.4811, lng: 122.5267, category: 'attraction' },
  ],
  '齐齐哈尔': [
    { name: '扎龙自然保护区', aliases: ['扎龙'], lat: 47.2500, lng: 124.2167, category: 'attraction' },
  ],
  '伊春': [
    { name: '汤旺河国家公园', lat: 48.2667, lng: 129.5167, category: 'attraction' },
    { name: '五营森林公园', lat: 48.1167, lng: 129.2333, category: 'attraction' },
  ],

  // 华东
  '上海': [
    { name: '外滩', lat: 31.2400, lng: 121.4900, category: 'attraction' },
    { name: '东方明珠', aliases: ['东方明珠塔'], lat: 31.2397, lng: 121.4998, category: 'attraction' },
    { name: '豫园', lat: 31.2272, lng: 121.4928, category: 'attraction' },
    { name: '南京路', aliases: ['南京路步行街'], lat: 31.2353, lng: 121.4727, category: 'district' },
    { name: '迪士尼乐园', aliases: ['上海迪士尼'], lat: 31.1434, lng: 121.6580, category: 'attraction' },
    { name: '陆家嘴', lat: 31.2397, lng: 121.5016, category: 'district' },
    { name: '田子坊', lat: 31.2100, lng: 121.4680, category: 'district' },
    { name: '上海博物馆', lat: 31.2290, lng: 121.4730, category: 'attraction' },
    { name: '朱家角古镇', aliases: ['朱家角'], lat: 31.1076, lng: 121.0538, category: 'attraction' },
    { name: '城隍庙', lat: 31.2272, lng: 121.4920, category: 'district' },
    { name: '新天地', lat: 31.2200, lng: 121.4800, category: 'district' },
    { name: '上海自然博物馆', lat: 31.2400, lng: 121.4600, category: 'attraction' },
    { name: '复兴公园', lat: 31.2200, lng: 121.4800, category: 'attraction' },
    { name: '思南公馆', lat: 31.2200, lng: 121.4700, category: 'district' },
    { name: '武康路', aliases: ['武康大楼'], lat: 31.2200, lng: 121.4600, category: 'district' },
    { name: '上海当代艺术博物馆', lat: 31.2100, lng: 121.4800, category: 'attraction' },
    { name: '上海野生动物园', lat: 31.0800, lng: 121.7800, category: 'attraction' },
    { name: '枫泾古镇', lat: 30.8800, lng: 121.0300, category: 'attraction' },
  ],
  '南京': [
    { name: '中山陵', lat: 32.0617, lng: 118.8487, category: 'attraction' },
    { name: '夫子庙', aliases: ['秦淮河风景区'], lat: 32.0228, lng: 118.7886, category: 'district' },
    { name: '明孝陵', lat: 32.0580, lng: 118.8477, category: 'attraction' },
    { name: '总统府', lat: 32.0420, lng: 118.7900, category: 'attraction' },
    { name: '玄武湖', lat: 32.0754, lng: 118.7977, category: 'attraction' },
    { name: '南京大屠杀遇难同胞纪念馆', lat: 32.0353, lng: 118.7407, category: 'attraction' },
    { name: '秦淮河', lat: 32.0228, lng: 118.7886, category: 'attraction' },
    { name: '雨花台', lat: 31.9928, lng: 118.7780, category: 'attraction' },
    { name: '南京长江大桥', lat: 32.0900, lng: 118.7200, category: 'attraction' },
    { name: '栖霞山', lat: 32.1300, lng: 118.9900, category: 'attraction' },
    { name: '老门东', lat: 32.0200, lng: 118.7900, category: 'district' },
    { name: '牛首山', lat: 31.9600, lng: 118.8000, category: 'attraction' },
    { name: '南京博物院', lat: 32.0500, lng: 118.8600, category: 'attraction' },
  ],
  '苏州': [
    { name: '拙政园', lat: 31.3262, lng: 120.6293, category: 'attraction' },
    { name: '狮子林', lat: 31.3257, lng: 120.6314, category: 'attraction' },
    { name: '虎丘', lat: 31.3386, lng: 120.5704, category: 'attraction' },
    { name: '留园', lat: 31.3173, lng: 120.6109, category: 'attraction' },
    { name: '平江路', lat: 31.3077, lng: 120.6243, category: 'district' },
    { name: '山塘街', lat: 31.3063, lng: 120.5790, category: 'district' },
    { name: '寒山寺', lat: 31.3140, lng: 120.5680, category: 'attraction' },
    { name: '周庄', lat: 31.1131, lng: 120.8516, category: 'attraction' },
    { name: '同里', lat: 31.1600, lng: 120.7167, category: 'attraction' },
    { name: '苏州博物馆', lat: 31.3230, lng: 120.6270, category: 'attraction' },
    { name: '网师园', lat: 31.3100, lng: 120.6300, category: 'attraction' },
    { name: '沧浪亭', lat: 31.3000, lng: 120.6200, category: 'attraction' },
    { name: '苏州园区金鸡湖', aliases: ['金鸡湖'], lat: 31.3300, lng: 120.7100, category: 'attraction' },
    { name: '甪直古镇', lat: 31.2200, lng: 120.7300, category: 'attraction' },
  ],
  '无锡': [
    { name: '鼋头渚', lat: 31.4194, lng: 120.2100, category: 'attraction' },
    { name: '灵山大佛', lat: 31.4210, lng: 120.0800, category: 'attraction' },
    { name: '拈花湾', lat: 31.4100, lng: 120.0600, category: 'attraction' },
  ],
  '扬州': [
    { name: '瘦西湖', lat: 32.4060, lng: 119.4200, category: 'attraction' },
    { name: '个园', lat: 32.3960, lng: 119.4300, category: 'attraction' },
    { name: '何园', lat: 32.3880, lng: 119.4280, category: 'attraction' },
  ],
  '常州': [
    { name: '中华恐龙园', aliases: ['恐龙园'], lat: 31.8300, lng: 119.9700, category: 'attraction' },
    { name: '天目湖', lat: 31.2600, lng: 119.4900, category: 'attraction' },
  ],
  '杭州': [
    { name: '西湖', lat: 30.2420, lng: 120.1485, category: 'attraction' },
    { name: '灵隐寺', lat: 30.2430, lng: 120.1010, category: 'attraction' },
    { name: '千岛湖', lat: 29.6000, lng: 119.0500, category: 'attraction' },
    { name: '宋城', lat: 30.1800, lng: 120.1200, category: 'attraction' },
    { name: '河坊街', lat: 30.2460, lng: 120.1700, category: 'district' },
    { name: '雷峰塔', lat: 30.2310, lng: 120.1490, category: 'attraction' },
    { name: '断桥残雪', aliases: ['断桥'], lat: 30.2580, lng: 120.1550, category: 'attraction' },
    { name: '龙井村', lat: 30.2200, lng: 120.1200, category: 'attraction' },
    { name: '西溪湿地', lat: 30.2700, lng: 120.0600, category: 'attraction' },
    { name: '六和塔', lat: 30.2100, lng: 120.1300, category: 'attraction' },
    { name: '岳王庙', lat: 30.2600, lng: 120.1400, category: 'attraction' },
    { name: '中国美术学院', lat: 30.2200, lng: 120.1400, category: 'attraction' },
    { name: '南宋御街', lat: 30.2500, lng: 120.1600, category: 'district' },
    { name: '浙江省博物馆', lat: 30.2500, lng: 120.1500, category: 'attraction' },
    { name: '西湖音乐喷泉', lat: 30.2400, lng: 120.1500, category: 'attraction' },
  ],
  '宁波': [
    { name: '天一阁', lat: 29.8670, lng: 121.5440, category: 'attraction' },
    { name: '溪口', aliases: ['溪口雪窦山'], lat: 29.7000, lng: 121.1000, category: 'attraction' },
  ],
  '绍兴': [
    { name: '鲁迅故里', lat: 30.0000, lng: 120.5850, category: 'attraction' },
    { name: '沈园', lat: 29.9900, lng: 120.5800, category: 'attraction' },
  ],
  '嘉兴': [
    { name: '乌镇', lat: 30.7487, lng: 120.4855, category: 'attraction' },
    { name: '西塘', lat: 30.9500, lng: 120.8833, category: 'attraction' },
    { name: '南湖', lat: 30.7500, lng: 120.7600, category: 'attraction' },
  ],
  '舟山': [
    { name: '普陀山', lat: 30.0000, lng: 122.3833, category: 'attraction' },
  ],
  '金华': [
    { name: '横店影视城', aliases: ['横店'], lat: 29.1700, lng: 120.2300, category: 'attraction' },
  ],
  '黄山': [
    { name: '黄山风景区', aliases: ['黄山'], lat: 30.1300, lng: 118.1700, category: 'attraction' },
    { name: '宏村', lat: 30.0015, lng: 117.9833, category: 'attraction' },
    { name: '西递', lat: 30.0500, lng: 117.9900, category: 'attraction' },
    { name: '屯溪老街', lat: 29.7100, lng: 118.3100, category: 'district' },
    { name: '徽州古城', lat: 29.8600, lng: 118.4300, category: 'attraction' },
  ],
  '合肥': [
    { name: '包公园', lat: 31.8500, lng: 117.3100, category: 'attraction' },
    { name: '三河古镇', lat: 31.6400, lng: 117.2400, category: 'attraction' },
    { name: '安徽省博物馆', lat: 31.8600, lng: 117.2900, category: 'attraction' },
    { name: '巢湖', lat: 31.5700, lng: 117.9000, category: 'attraction' },
    { name: '紫蓬山', lat: 31.7800, lng: 117.0700, category: 'attraction' },
    { name: '逍遥津公园', lat: 31.8500, lng: 117.2800, category: 'attraction' },
    { name: '滨湖新区', lat: 31.7200, lng: 117.2600, category: 'district' },
  ],
  '安庆': [
    { name: '天柱山', lat: 30.7500, lng: 116.4700, category: 'attraction' },
  ],
  '厦门': [
    { name: '鼓浪屿', lat: 24.4488, lng: 118.0670, category: 'attraction' },
    { name: '南普陀寺', lat: 24.4400, lng: 118.0900, category: 'attraction' },
    { name: '厦门大学', lat: 24.4400, lng: 118.1000, category: 'attraction' },
    { name: '曾厝垵', lat: 24.4400, lng: 118.0880, category: 'district' },
    { name: '环岛路', lat: 24.4350, lng: 118.1000, category: 'attraction' },
    { name: '中山路', lat: 24.4500, lng: 118.0830, category: 'district' },
  ],
  '福州': [
    { name: '三坊七巷', lat: 26.0800, lng: 119.2900, category: 'district' },
    { name: '鼓山', lat: 26.0600, lng: 119.3600, category: 'attraction' },
    { name: '西湖公园', lat: 26.0800, lng: 119.2800, category: 'attraction' },
    { name: '林则徐纪念馆', lat: 26.0700, lng: 119.3000, category: 'attraction' },
    { name: '福州国家森林公园', lat: 26.0900, lng: 119.3200, category: 'attraction' },
    { name: '朱紫坊', lat: 26.0700, lng: 119.3000, category: 'district' },
    { name: '烟台山', lat: 26.0600, lng: 119.3000, category: 'attraction' },
    { name: '昙石山遗址博物馆', lat: 25.9700, lng: 119.2400, category: 'attraction' },
  ],
  '泉州': [
    { name: '开元寺', lat: 24.9100, lng: 118.5900, category: 'attraction' },
    { name: '清源山', lat: 24.9500, lng: 118.6300, category: 'attraction' },
  ],
  '南昌': [
    { name: '滕王阁', lat: 28.6800, lng: 115.8800, category: 'attraction' },
    { name: '八一起义纪念馆', lat: 28.6800, lng: 115.8900, category: 'attraction' },
    { name: '万寿宫历史文化街区', aliases: ['万寿宫'], lat: 28.6900, lng: 115.9000, category: 'district' },
    { name: '绳金塔', lat: 28.6900, lng: 115.8900, category: 'attraction' },
    { name: '南昌汉代海昏侯国遗址公园', aliases: ['海昏侯遗址'], lat: 28.9400, lng: 115.9000, category: 'attraction' },
    { name: '青云谱', lat: 28.6000, lng: 115.9000, category: 'attraction' },
    { name: '安义古村群', lat: 28.7400, lng: 115.4500, category: 'attraction' },
  ],
  '九江': [
    { name: '庐山', lat: 29.5600, lng: 115.9900, category: 'attraction' },
    { name: '鄱阳湖', lat: 29.2700, lng: 116.2200, category: 'attraction' },
  ],
  '景德镇': [
    { name: '古窑民俗博览区', aliases: ['古窑'], lat: 29.2700, lng: 117.2000, category: 'attraction' },
  ],
  '济南': [
    { name: '趵突泉', lat: 36.6600, lng: 116.9900, category: 'attraction' },
    { name: '大明湖', lat: 36.6800, lng: 117.0000, category: 'attraction' },
    { name: '千佛山', lat: 36.6200, lng: 116.9900, category: 'attraction' },
    { name: '五龙潭', lat: 36.6700, lng: 116.9900, category: 'attraction' },
    { name: '芙蓉街', lat: 36.6700, lng: 117.0100, category: 'district' },
    { name: '百花洲', lat: 36.6800, lng: 117.0100, category: 'district' },
    { name: '泉城广场', lat: 36.6700, lng: 117.0000, category: 'attraction' },
    { name: '中国重汽博物馆', lat: 36.6800, lng: 116.9800, category: 'attraction' },
  ],
  '青岛': [
    { name: '栈桥', lat: 36.0600, lng: 120.3200, category: 'attraction' },
    { name: '八大关', lat: 36.0600, lng: 120.3500, category: 'district' },
    { name: '崂山', lat: 36.1100, lng: 120.6300, category: 'attraction' },
    { name: '五四广场', lat: 36.0600, lng: 120.3800, category: 'attraction' },
    { name: '金沙滩', lat: 35.9600, lng: 120.2300, category: 'attraction' },
  ],
  '烟台': [
    { name: '蓬莱阁', lat: 37.8000, lng: 120.7600, category: 'attraction' },
    { name: '长岛', lat: 37.9200, lng: 120.7300, category: 'attraction' },
  ],
  '威海': [
    { name: '刘公岛', lat: 37.5100, lng: 122.1600, category: 'attraction' },
    { name: '成山头', lat: 37.4000, lng: 122.6800, category: 'attraction' },
  ],
  '泰安': [
    { name: '泰山', lat: 36.2500, lng: 117.1000, category: 'attraction' },
  ],
  '曲阜': [], // no separate city entry, belongs to 济宁
  '济宁': [
    { name: '曲阜三孔', aliases: ['孔庙', '孔府', '孔林'], lat: 35.5800, lng: 116.9900, category: 'attraction' },
  ],

  // 华中
  '郑州': [
    { name: '少林寺', lat: 34.5100, lng: 112.9500, category: 'attraction' },
    { name: '黄河风景名胜区', aliases: ['黄河游览区'], lat: 34.9100, lng: 113.6100, category: 'attraction' },
    { name: '河南博物院', lat: 34.7700, lng: 113.6600, category: 'attraction' },
    { name: '嵩山', lat: 34.5100, lng: 112.9600, category: 'attraction' },
    { name: '郑州商城遗址', lat: 34.7600, lng: 113.6700, category: 'attraction' },
    { name: '大玉米楼', lat: 34.7800, lng: 113.7200, category: 'attraction' },
    { name: '绿博园', lat: 34.7600, lng: 113.8300, category: 'attraction' },
  ],
  '洛阳': [
    { name: '龙门石窟', lat: 34.5550, lng: 112.4700, category: 'attraction' },
    { name: '白马寺', lat: 34.7300, lng: 112.5900, category: 'attraction' },
    { name: '洛阳博物馆', lat: 34.6500, lng: 112.4200, category: 'attraction' },
    { name: '丽景门', lat: 34.6800, lng: 112.4400, category: 'district' },
    { name: '老君山', lat: 33.7400, lng: 111.6100, category: 'attraction' },
  ],
  '开封': [
    { name: '清明上河园', lat: 34.8000, lng: 114.3500, category: 'attraction' },
    { name: '大相国寺', lat: 34.7900, lng: 114.3500, category: 'attraction' },
  ],
  '安阳': [
    { name: '殷墟', lat: 36.1200, lng: 114.3300, category: 'attraction' },
    { name: '红旗渠', lat: 36.0800, lng: 113.8000, category: 'attraction' },
  ],
  '焦作': [
    { name: '云台山', lat: 35.4200, lng: 113.2500, category: 'attraction' },
  ],
  '武汉': [
    { name: '黄鹤楼', lat: 30.5440, lng: 114.3025, category: 'attraction' },
    { name: '东湖', lat: 30.5500, lng: 114.3800, category: 'attraction' },
    { name: '武汉长江大桥', lat: 30.5490, lng: 114.2880, category: 'attraction' },
    { name: '户部巷', lat: 30.5450, lng: 114.3050, category: 'district' },
    { name: '武汉大学', lat: 30.5300, lng: 114.3600, category: 'attraction' },
    { name: '归元寺', lat: 30.5400, lng: 114.2600, category: 'attraction' },
    { name: '江汉路', lat: 30.5800, lng: 114.2900, category: 'district' },
    { name: '汉口租界', lat: 30.5900, lng: 114.3000, category: 'district' },
    { name: '武汉科技馆', lat: 30.5600, lng: 114.3100, category: 'attraction' },
    { name: '昙华林', lat: 30.5500, lng: 114.3300, category: 'district' },
    { name: '木兰山', lat: 31.0900, lng: 114.5000, category: 'attraction' },
    { name: '辛亥革命博物馆', lat: 30.5400, lng: 114.3000, category: 'attraction' },
  ],
  '宜昌': [
    { name: '三峡大坝', lat: 30.8200, lng: 111.0000, category: 'attraction' },
    { name: '清江画廊', lat: 30.4600, lng: 111.1400, category: 'attraction' },
  ],
  '十堰': [
    { name: '武当山', lat: 32.4000, lng: 111.0000, category: 'attraction' },
  ],
  '恩施': [
    { name: '恩施大峡谷', lat: 30.3200, lng: 109.4800, category: 'attraction' },
  ],
  '长沙': [
    { name: '橘子洲', lat: 28.1800, lng: 112.9600, category: 'attraction' },
    { name: '岳麓山', lat: 28.1900, lng: 112.9300, category: 'attraction' },
    { name: '湖南省博物馆', lat: 28.2200, lng: 112.9700, category: 'attraction' },
    { name: '太平老街', lat: 28.1900, lng: 112.9800, category: 'district' },
    { name: '天心阁', lat: 28.1800, lng: 112.9800, category: 'attraction' },
    { name: '文和友', lat: 28.2000, lng: 113.0200, category: 'district' },
    { name: '坡子街', lat: 28.1900, lng: 112.9700, category: 'district' },
    { name: '岳麓书院', lat: 28.1900, lng: 112.9300, category: 'attraction' },
    { name: '长沙铜官窑', lat: 28.3500, lng: 113.2200, category: 'attraction' },
    { name: '炭河里古城', lat: 28.4800, lng: 112.5300, category: 'attraction' },
    { name: '大王山旅游度假区', lat: 28.0500, lng: 112.8900, category: 'attraction' },
  ],
  '张家界': [
    { name: '武陵源', aliases: ['张家界国家森林公园'], lat: 29.3200, lng: 110.4300, category: 'attraction' },
    { name: '天门山', lat: 29.0500, lng: 110.4800, category: 'attraction' },
    { name: '张家界大峡谷', lat: 29.3700, lng: 110.5800, category: 'attraction' },
  ],
  '岳阳': [
    { name: '岳阳楼', lat: 29.3800, lng: 113.1300, category: 'attraction' },
  ],
  '衡阳': [
    { name: '南岳衡山', aliases: ['衡山'], lat: 27.2500, lng: 112.7300, category: 'attraction' },
  ],
  '郴州': [
    { name: '东江湖', lat: 25.9300, lng: 113.1400, category: 'attraction' },
  ],
  '湘西': [
    { name: '凤凰古城', aliases: ['凤凰'], lat: 27.9500, lng: 109.6000, category: 'attraction' },
  ],

  // 华南
  '广州': [
    { name: '广州塔', aliases: ['小蛮腰'], lat: 23.1066, lng: 113.3248, category: 'attraction' },
    { name: '白云山', lat: 23.1849, lng: 113.2989, category: 'attraction' },
    { name: '陈家祠', lat: 23.1300, lng: 113.2500, category: 'attraction' },
    { name: '沙面', lat: 23.1100, lng: 113.2400, category: 'district' },
    { name: '上下九步行街', aliases: ['上下九'], lat: 23.1200, lng: 113.2500, category: 'district' },
    { name: '长隆旅游度假区', aliases: ['长隆'], lat: 22.9950, lng: 113.3270, category: 'attraction' },
    { name: '越秀公园', lat: 23.1400, lng: 113.2600, category: 'attraction' },
    { name: '南越王博物院', lat: 23.1400, lng: 113.2600, category: 'attraction' },
    { name: '北京路步行街', aliases: ['北京路'], lat: 23.1300, lng: 113.2700, category: 'district' },
    { name: '珠江夜游', lat: 23.1000, lng: 113.2700, category: 'attraction' },
    { name: '从化温泉', lat: 23.5500, lng: 113.6000, category: 'attraction' },
    { name: '广州动物园', lat: 23.1600, lng: 113.3100, category: 'attraction' },
    { name: '增城白水寨', lat: 23.6200, lng: 113.9700, category: 'attraction' },
  ],
  '深圳': [
    { name: '世界之窗', lat: 22.5350, lng: 113.9750, category: 'attraction' },
    { name: '欢乐谷', lat: 22.5400, lng: 113.9800, category: 'attraction' },
    { name: '东部华侨城', lat: 22.6200, lng: 114.2900, category: 'attraction' },
    { name: '大梅沙', lat: 22.5900, lng: 114.3000, category: 'attraction' },
    { name: '深圳湾公园', lat: 22.5100, lng: 113.9500, category: 'attraction' },
    { name: '大鹏所城', lat: 22.5900, lng: 114.4800, category: 'attraction' },
    { name: '华强北', lat: 22.5300, lng: 114.0800, category: 'district' },
    { name: '深圳博物馆', lat: 22.5400, lng: 114.0700, category: 'attraction' },
    { name: '深圳中心公园', lat: 22.5600, lng: 114.0400, category: 'attraction' },
    { name: '小梅沙', lat: 22.5900, lng: 114.2900, category: 'attraction' },
  ],
  '珠海': [
    { name: '长隆海洋王国', lat: 22.1000, lng: 113.5300, category: 'attraction' },
    { name: '渔女像', lat: 22.2400, lng: 113.5800, category: 'attraction' },
  ],
  '佛山': [
    { name: '祖庙', lat: 23.0200, lng: 113.1200, category: 'attraction' },
    { name: '西樵山', lat: 22.9300, lng: 112.9700, category: 'attraction' },
  ],
  '汕头': [
    { name: '南澳岛', lat: 23.4300, lng: 117.0300, category: 'attraction' },
  ],
  '韶关': [
    { name: '丹霞山', lat: 25.0100, lng: 113.7400, category: 'attraction' },
  ],
  '桂林': [
    { name: '漓江', lat: 25.2700, lng: 110.2900, category: 'attraction' },
    { name: '阳朔西街', aliases: ['阳朔'], lat: 24.7800, lng: 110.4900, category: 'district' },
    { name: '象鼻山', lat: 25.2600, lng: 110.2900, category: 'attraction' },
    { name: '龙脊梯田', lat: 25.7900, lng: 110.1100, category: 'attraction' },
    { name: '两江四湖', lat: 25.2700, lng: 110.2900, category: 'attraction' },
    { name: '银子岩', lat: 24.8100, lng: 110.5600, category: 'attraction' },
    { name: '独秀峰', lat: 25.2800, lng: 110.2900, category: 'attraction' },
    { name: '七星公园', lat: 25.2800, lng: 110.3200, category: 'attraction' },
    { name: '遇龙河', lat: 24.7400, lng: 110.4000, category: 'attraction' },
    { name: '兴坪渔村', lat: 24.9300, lng: 110.5200, category: 'attraction' },
    { name: '资源八角寨', lat: 26.0400, lng: 110.6300, category: 'attraction' },
  ],
  '南宁': [
    { name: '青秀山', lat: 22.7900, lng: 108.3800, category: 'attraction' },
    { name: '南宁动物园', lat: 22.8400, lng: 108.3900, category: 'attraction' },
    { name: '广西民族博物馆', lat: 22.8100, lng: 108.3900, category: 'attraction' },
    { name: '中山路美食街', lat: 22.8200, lng: 108.3700, category: 'district' },
    { name: '南湖公园', lat: 22.8000, lng: 108.3900, category: 'attraction' },
    { name: '伊岭岩', lat: 22.8800, lng: 108.2600, category: 'attraction' },
  ],
  '北海': [
    { name: '银滩', lat: 21.4400, lng: 109.0700, category: 'attraction' },
    { name: '涠洲岛', lat: 21.0500, lng: 109.1000, category: 'attraction' },
  ],
  '柳州': [
    { name: '柳侯公园', lat: 24.3200, lng: 109.4100, category: 'attraction' },
  ],
  '海口': [
    { name: '骑楼老街', lat: 20.0300, lng: 110.3400, category: 'district' },
    { name: '万绿园', lat: 20.0200, lng: 110.3300, category: 'attraction' },
  ],
  '三亚': [
    { name: '亚龙湾', lat: 18.1900, lng: 109.6400, category: 'attraction' },
    { name: '天涯海角', lat: 18.3000, lng: 109.2300, category: 'attraction' },
    { name: '蜈支洲岛', lat: 18.3100, lng: 109.4500, category: 'attraction' },
    { name: '南山寺', aliases: ['南山文化旅游区'], lat: 18.3000, lng: 109.0900, category: 'attraction' },
    { name: '大东海', lat: 18.2200, lng: 109.4800, category: 'attraction' },
  ],

  // 西南
  '重庆': [
    { name: '洪崖洞', lat: 29.5620, lng: 106.5820, category: 'attraction' },
    { name: '解放碑', lat: 29.5570, lng: 106.5780, category: 'district' },
    { name: '磁器口古镇', aliases: ['磁器口'], lat: 29.5800, lng: 106.4500, category: 'attraction' },
    { name: '长江索道', lat: 29.5600, lng: 106.5900, category: 'attraction' },
    { name: '武隆天生三桥', aliases: ['武隆天坑'], lat: 29.3200, lng: 107.7700, category: 'attraction' },
    { name: '大足石刻', lat: 29.7100, lng: 105.7200, category: 'attraction' },
    { name: '南山一棵树', lat: 29.5300, lng: 106.5700, category: 'attraction' },
    { name: '朝天门', lat: 29.5630, lng: 106.5900, category: 'district' },
    { name: '重庆自然博物馆', lat: 29.5800, lng: 106.5200, category: 'attraction' },
    { name: '三峡博物馆', lat: 29.5600, lng: 106.5600, category: 'attraction' },
    { name: '南滨路', lat: 29.5400, lng: 106.5700, category: 'district' },
    { name: '四面山', lat: 28.7000, lng: 105.9900, category: 'attraction' },
    { name: '仙女山', lat: 29.6100, lng: 107.9100, category: 'attraction' },
    { name: '统景温泉', lat: 29.7100, lng: 106.7600, category: 'attraction' },
  ],
  '成都': [
    { name: '宽窄巷子', aliases: ['宽窄巷'], lat: 30.6697, lng: 104.0555, category: 'district' },
    { name: '武侯祠', lat: 30.6435, lng: 104.0472, category: 'attraction' },
    { name: '锦里', lat: 30.6420, lng: 104.0480, category: 'district' },
    { name: '大熊猫繁育研究基地', aliases: ['熊猫基地'], lat: 30.7300, lng: 104.1500, category: 'attraction' },
    { name: '都江堰', lat: 30.9900, lng: 103.6200, category: 'attraction' },
    { name: '青城山', lat: 30.9300, lng: 103.5700, category: 'attraction' },
    { name: '春熙路', lat: 30.6570, lng: 104.0810, category: 'district' },
    { name: '杜甫草堂', lat: 30.6590, lng: 104.0350, category: 'attraction' },
    { name: '金沙遗址博物馆', aliases: ['金沙遗址'], lat: 30.6800, lng: 104.0100, category: 'attraction' },
    { name: '成都博物馆', lat: 30.6700, lng: 104.0600, category: 'attraction' },
    { name: '太古里', lat: 30.6550, lng: 104.0810, category: 'district' },
    { name: '天府广场', lat: 30.6590, lng: 104.0680, category: 'attraction' },
    { name: '浣花溪公园', lat: 30.6600, lng: 104.0300, category: 'attraction' },
    { name: '黄龙溪古镇', lat: 30.3700, lng: 103.9700, category: 'attraction' },
    { name: '平乐古镇', lat: 30.1400, lng: 103.5200, category: 'attraction' },
  ],
  '乐山': [
    { name: '乐山大佛', lat: 29.5400, lng: 103.7700, category: 'attraction' },
    { name: '峨眉山', lat: 29.6000, lng: 103.3300, category: 'attraction' },
  ],
  '宜宾': [
    { name: '蜀南竹海', lat: 28.3300, lng: 104.9300, category: 'attraction' },
  ],
  '阿坝': [
    { name: '九寨沟', lat: 33.2600, lng: 103.9200, category: 'attraction' },
    { name: '黄龙', lat: 32.7500, lng: 103.8400, category: 'attraction' },
    { name: '四姑娘山', lat: 31.1000, lng: 102.9000, category: 'attraction' },
  ],
  '甘孜': [
    { name: '稻城亚丁', aliases: ['亚丁'], lat: 28.4800, lng: 100.3000, category: 'attraction' },
    { name: '海螺沟', lat: 29.5800, lng: 102.0000, category: 'attraction' },
    { name: '新都桥', lat: 30.0500, lng: 101.4900, category: 'attraction' },
  ],
  '凉山': [
    { name: '泸沽湖', lat: 27.7000, lng: 100.7800, category: 'attraction' },
    { name: '邛海', lat: 27.8800, lng: 102.2900, category: 'attraction' },
  ],
  '贵阳': [
    { name: '甲秀楼', lat: 26.5700, lng: 106.7100, category: 'attraction' },
    { name: '青岩古镇', lat: 26.3400, lng: 106.6800, category: 'attraction' },
    { name: '花溪公园', lat: 26.4100, lng: 106.6700, category: 'attraction' },
    { name: '贵州省博物馆', lat: 26.5900, lng: 106.7300, category: 'attraction' },
    { name: '观山湖公园', lat: 26.6300, lng: 106.6200, category: 'attraction' },
    { name: '天河潭', lat: 26.3900, lng: 106.5400, category: 'attraction' },
    { name: '贵阳孔学堂', lat: 26.4200, lng: 106.6600, category: 'attraction' },
  ],
  '遵义': [
    { name: '遵义会议会址', lat: 27.7000, lng: 106.9300, category: 'attraction' },
    { name: '赤水丹霞', lat: 28.5900, lng: 105.7000, category: 'attraction' },
  ],
  '安顺': [
    { name: '黄果树瀑布', aliases: ['黄果树'], lat: 25.9900, lng: 105.6600, category: 'attraction' },
    { name: '龙宫', lat: 25.9500, lng: 105.7700, category: 'attraction' },
  ],
  '毕节': [
    { name: '百里杜鹃', lat: 27.2000, lng: 105.7700, category: 'attraction' },
  ],
  '黔东南': [
    { name: '西江千户苗寨', aliases: ['千户苗寨'], lat: 26.5800, lng: 108.1900, category: 'attraction' },
    { name: '镇远古城', lat: 27.0500, lng: 108.4300, category: 'attraction' },
  ],
  '黔南': [
    { name: '荔波小七孔', aliases: ['小七孔'], lat: 25.2800, lng: 107.7400, category: 'attraction' },
  ],
  '昆明': [
    { name: '滇池', aliases: ['昆明湖'], lat: 24.8000, lng: 102.6500, category: 'attraction' },
    { name: '石林', lat: 24.7700, lng: 103.2700, category: 'attraction' },
    { name: '翠湖', lat: 25.0400, lng: 102.7050, category: 'attraction' },
    { name: '西山龙门', aliases: ['西山'], lat: 24.9600, lng: 102.6300, category: 'attraction' },
    { name: '金殿', lat: 25.0800, lng: 102.7600, category: 'attraction' },
    { name: '云南民族村', lat: 24.8700, lng: 102.6700, category: 'attraction' },
    { name: '云南省博物馆', lat: 25.0500, lng: 102.7200, category: 'attraction' },
    { name: '筇竹寺', lat: 25.0700, lng: 102.5700, category: 'attraction' },
    { name: '昆明老街', lat: 25.0400, lng: 102.7100, category: 'district' },
    { name: '世博园', lat: 25.1300, lng: 102.7800, category: 'attraction' },
  ],
  '大理': [
    { name: '洱海', lat: 25.6200, lng: 100.2200, category: 'attraction' },
    { name: '大理古城', lat: 25.6000, lng: 100.2300, category: 'attraction' },
    { name: '苍山', lat: 25.6800, lng: 100.1500, category: 'attraction' },
    { name: '崇圣寺三塔', aliases: ['三塔'], lat: 25.6300, lng: 100.1600, category: 'attraction' },
    { name: '双廊', lat: 25.6900, lng: 100.1900, category: 'attraction' },
    { name: '喜洲古镇', lat: 25.7600, lng: 100.1700, category: 'attraction' },
    { name: '沙溪古镇', lat: 26.1300, lng: 99.9200, category: 'attraction' },
    { name: '剑川海门口遗址', lat: 26.5200, lng: 99.9000, category: 'attraction' },
    { name: '弥渡花灯', lat: 25.3400, lng: 100.4900, category: 'attraction' },
  ],
  '丽江': [
    { name: '丽江古城', aliases: ['大研古城'], lat: 26.8700, lng: 100.2300, category: 'attraction' },
    { name: '玉龙雪山', lat: 27.1000, lng: 100.1800, category: 'attraction' },
    { name: '束河古镇', lat: 26.9100, lng: 100.2100, category: 'attraction' },
    { name: '泸沽湖', lat: 27.7000, lng: 100.7800, category: 'attraction' },
    { name: '蓝月谷', lat: 27.1200, lng: 100.1600, category: 'attraction' },
    { name: '白沙古镇', lat: 27.0000, lng: 100.2100, category: 'attraction' },
    { name: '木府', lat: 26.8700, lng: 100.2300, category: 'attraction' },
    { name: '黑龙潭公园', lat: 26.8900, lng: 100.2400, category: 'attraction' },
    { name: '老君山', lat: 26.3300, lng: 99.7500, category: 'attraction' },
  ],
  '西双版纳': [
    { name: '热带植物园', lat: 21.9200, lng: 101.2500, category: 'attraction' },
    { name: '野象谷', lat: 22.0500, lng: 100.8700, category: 'attraction' },
    { name: '曼听公园', lat: 22.0000, lng: 100.8000, category: 'attraction' },
  ],
  '迪庆': [
    { name: '香格里拉', aliases: ['中甸'], lat: 27.8300, lng: 99.7000, category: 'attraction' },
    { name: '普达措国家公园', lat: 27.9000, lng: 99.9500, category: 'attraction' },
  ],
  '拉萨': [
    { name: '布达拉宫', lat: 29.6557, lng: 91.1172, category: 'attraction' },
    { name: '大昭寺', lat: 29.6500, lng: 91.1300, category: 'attraction' },
    { name: '八廓街', lat: 29.6520, lng: 91.1320, category: 'district' },
    { name: '纳木错', lat: 30.7000, lng: 90.5000, category: 'attraction' },
    { name: '罗布林卡', lat: 29.6500, lng: 91.1000, category: 'attraction' },
    { name: '色拉寺', lat: 29.6800, lng: 91.1100, category: 'attraction' },
    { name: '哲蚌寺', lat: 29.6700, lng: 91.0500, category: 'attraction' },
    { name: '甘丹寺', lat: 29.8300, lng: 91.4200, category: 'attraction' },
    { name: '藏医博物馆', lat: 29.6600, lng: 91.1000, category: 'attraction' },
    { name: '扎基寺', lat: 29.6700, lng: 91.1200, category: 'attraction' },
  ],
  '日喀则': [
    { name: '扎什伦布寺', lat: 29.2700, lng: 88.8800, category: 'attraction' },
    { name: '珠穆朗玛峰', aliases: ['珠峰', ' Everest'], lat: 28.0000, lng: 86.9200, category: 'attraction' },
  ],
  '林芝': [
    { name: '雅鲁藏布大峡谷', lat: 29.5000, lng: 94.7000, category: 'attraction' },
    { name: '南迦巴瓦峰', lat: 29.6300, lng: 95.0500, category: 'attraction' },
  ],

  // 西北
  '西安': [
    { name: '秦始皇兵马俑', aliases: ['兵马俑'], lat: 34.3842, lng: 109.2785, category: 'attraction' },
    { name: '华清池', aliases: ['华清宫'], lat: 34.3600, lng: 109.2100, category: 'attraction' },
    { name: '大雁塔', lat: 34.2186, lng: 108.9644, category: 'attraction' },
    { name: '西安城墙', aliases: ['城墙'], lat: 34.2600, lng: 108.9400, category: 'attraction' },
    { name: '回民街', lat: 34.2650, lng: 108.9400, category: 'district' },
    { name: '陕西历史博物馆', lat: 34.2240, lng: 108.9580, category: 'attraction' },
    { name: '大唐芙蓉园', lat: 34.2100, lng: 108.9700, category: 'attraction' },
    { name: '钟楼', lat: 34.2600, lng: 108.9460, category: 'attraction' },
    { name: '小雁塔', lat: 34.2500, lng: 108.9600, category: 'attraction' },
    { name: '曲江池遗址公园', lat: 34.2000, lng: 109.0000, category: 'attraction' },
    { name: '大明宫遗址公园', lat: 34.2900, lng: 108.9600, category: 'attraction' },
    { name: '永兴坊', lat: 34.2700, lng: 108.9600, category: 'district' },
    { name: '西安博物院', lat: 34.2500, lng: 108.9600, category: 'attraction' },
  ],
  '咸阳': [
    { name: '乾陵', lat: 34.5700, lng: 108.2100, category: 'attraction' },
    { name: '茂陵', lat: 34.3500, lng: 108.1500, category: 'attraction' },
  ],
  '延安': [
    { name: '黄帝陵', lat: 35.5800, lng: 109.2500, category: 'attraction' },
    { name: '宝塔山', lat: 36.5900, lng: 109.4900, category: 'attraction' },
    { name: '壶口瀑布', lat: 36.1407, lng: 110.4437, category: 'attraction' },
  ],
  '宝鸡': [
    { name: '法门寺', lat: 34.4700, lng: 107.8900, category: 'attraction' },
    { name: '太白山', lat: 34.0000, lng: 107.7000, category: 'attraction' },
  ],
  '渭南': [
    { name: '华山', lat: 34.4800, lng: 110.0800, category: 'attraction' },
  ],
  '汉中': [
    { name: '古汉台', lat: 33.0700, lng: 107.0300, category: 'attraction' },
  ],
  '兰州': [
    { name: '中山桥', aliases: ['黄河铁桥'], lat: 36.0600, lng: 103.8300, category: 'attraction' },
    { name: '白塔山', lat: 36.0700, lng: 103.8300, category: 'attraction' },
    { name: '甘肃省博物馆', lat: 36.0500, lng: 103.8200, category: 'attraction' },
    { name: '黄河风情线', lat: 36.0600, lng: 103.8200, category: 'attraction' },
    { name: '五泉山', lat: 36.0500, lng: 103.8200, category: 'attraction' },
    { name: '兰州老街', lat: 36.0500, lng: 103.8300, category: 'district' },
    { name: '水车博览园', lat: 36.0600, lng: 103.7900, category: 'attraction' },
  ],
  '天水': [
    { name: '麦积山石窟', lat: 34.3800, lng: 105.9900, category: 'attraction' },
  ],
  '嘉峪关': [
    { name: '嘉峪关城楼', aliases: ['嘉峪关'], lat: 39.7700, lng: 98.2900, category: 'attraction' },
  ],
  '张掖': [
    { name: '七彩丹霞', aliases: ['张掖丹霞'], lat: 38.9300, lng: 100.1500, category: 'attraction' },
    { name: '大佛寺', lat: 38.9300, lng: 100.4500, category: 'attraction' },
  ],
  '酒泉': [
    { name: '敦煌莫高窟', aliases: ['莫高窟'], lat: 40.0400, lng: 94.8100, category: 'attraction' },
    { name: '鸣沙山月牙泉', aliases: ['月牙泉', '鸣沙山'], lat: 40.0900, lng: 94.6800, category: 'attraction' },
  ],
  '武威': [
    { name: '雷台汉墓', lat: 37.9300, lng: 102.6300, category: 'attraction' },
  ],
  '西宁': [
    { name: '塔尔寺', lat: 36.5000, lng: 101.5700, category: 'attraction' },
    { name: '青海湖', lat: 36.9000, lng: 100.1000, category: 'attraction' },
    { name: '东关清真大寺', lat: 36.6200, lng: 101.7900, category: 'attraction' },
    { name: '北山寺', lat: 36.6400, lng: 101.7600, category: 'attraction' },
    { name: '青海省博物馆', lat: 36.6300, lng: 101.7800, category: 'attraction' },
    { name: '南山公园', lat: 36.6000, lng: 101.7600, category: 'attraction' },
    { name: '互助土族故土园', lat: 36.8400, lng: 101.9600, category: 'attraction' },
  ],
  '海西': [
    { name: '茶卡盐湖', lat: 36.7200, lng: 99.0800, category: 'attraction' },
    { name: '可可西里', lat: 35.2500, lng: 92.5000, category: 'attraction' },
  ],
  '海北': [
    { name: '祁连山', lat: 38.1000, lng: 100.2500, category: 'attraction' },
  ],
  '银川': [
    { name: '沙湖', lat: 38.8300, lng: 106.3500, category: 'attraction' },
    { name: '西夏王陵', lat: 38.6400, lng: 105.9900, category: 'attraction' },
    { name: '镇北堡西部影城', aliases: ['西部影城'], lat: 38.6200, lng: 105.9600, category: 'attraction' },
    { name: '南关清真寺', lat: 38.4700, lng: 106.2300, category: 'attraction' },
    { name: '贺兰山岩画', lat: 38.7000, lng: 105.9600, category: 'attraction' },
    { name: '宁夏博物馆', lat: 38.4900, lng: 106.2700, category: 'attraction' },
  ],
  '中卫': [
    { name: '沙坡头', lat: 37.5000, lng: 104.9800, category: 'attraction' },
  ],
  '乌鲁木齐': [
    { name: '天山天池', aliases: ['天池'], lat: 43.8800, lng: 88.1200, category: 'attraction' },
    { name: '国际大巴扎', aliases: ['大巴扎'], lat: 43.8000, lng: 87.6300, category: 'district' },
    { name: '红山公园', lat: 43.8000, lng: 87.6200, category: 'attraction' },
    { name: '新疆维吾尔自治区博物馆', aliases: ['新疆博物馆'], lat: 43.8000, lng: 87.5900, category: 'attraction' },
    { name: '新疆国际野生动物园', lat: 43.9500, lng: 87.5800, category: 'attraction' },
    { name: '二道桥民俗风情街', aliases: ['二道桥'], lat: 43.7800, lng: 87.6200, category: 'district' },
    { name: '南山风景区', lat: 43.5500, lng: 87.5000, category: 'attraction' },
  ],
  '吐鲁番': [
    { name: '火焰山', lat: 42.9300, lng: 89.5100, category: 'attraction' },
    { name: '葡萄沟', lat: 42.9500, lng: 89.2400, category: 'attraction' },
    { name: '坎儿井', lat: 42.9500, lng: 89.2000, category: 'attraction' },
    { name: '交河故城', lat: 42.9500, lng: 89.0700, category: 'attraction' },
  ],
  '喀什': [
    { name: '喀什老城', aliases: ['喀什古城'], lat: 39.4700, lng: 75.9900, category: 'attraction' },
    { name: '艾提尕尔清真寺', lat: 39.4700, lng: 75.9900, category: 'attraction' },
  ],
  '伊犁': [
    { name: '那拉提草原', lat: 43.3300, lng: 84.0100, category: 'attraction' },
    { name: '赛里木湖', lat: 44.6000, lng: 81.2100, category: 'attraction' },
  ],
  '阿勒泰': [
    { name: '喀纳斯', lat: 48.6900, lng: 87.0100, category: 'attraction' },
    { name: '禾木', lat: 48.5800, lng: 87.2400, category: 'attraction' },
    { name: '可可托海', lat: 47.3100, lng: 89.8200, category: 'attraction' },
  ],
  '和田': [
    { name: '和田大巴扎', lat: 37.1100, lng: 79.9300, category: 'district' },
  ],
  '巴音郭楞': [
    { name: '巴音布鲁克草原', aliases: ['巴音布鲁克'], lat: 42.8900, lng: 84.1500, category: 'attraction' },
    { name: '博斯腾湖', lat: 41.9700, lng: 87.0500, category: 'attraction' },
    { name: '罗布人村寨', lat: 40.2000, lng: 87.9000, category: 'attraction' },
  ],
  '昌吉': [
    { name: '天山天池', aliases: ['天池'], lat: 43.8800, lng: 88.1200, category: 'attraction' },
    { name: '硫磺沟丹霞地貌', lat: 44.1200, lng: 87.3500, category: 'attraction' },
  ],
  '哈密': [
    { name: '哈密瓜之乡', lat: 42.8200, lng: 93.5100, category: 'attraction' },
    { name: '白石头风景区', lat: 42.9000, lng: 94.0000, category: 'attraction' },
    { name: '库木塔格沙漠', lat: 42.6600, lng: 94.3600, category: 'attraction' },
    { name: '哈密回王陵', lat: 42.8200, lng: 93.5200, category: 'attraction' },
  ],
  '阿克苏': [
    { name: '库车大峡谷', aliases: ['天山神秘大峡谷'], lat: 41.7200, lng: 82.9500, category: 'attraction' },
    { name: '克孜尔千佛洞', aliases: ['克孜尔石窟'], lat: 41.7600, lng: 82.5200, category: 'attraction' },
    { name: '温宿大峡谷', lat: 41.3800, lng: 80.2900, category: 'attraction' },
  ],
  '克拉玛依': [
    { name: '魔鬼城', aliases: ['克拉玛依乌尔禾魔鬼城'], lat: 46.0900, lng: 85.6400, category: 'attraction' },
    { name: '百口泉采油区', lat: 45.9300, lng: 84.9800, category: 'attraction' },
  ],
  '塔城': [
    { name: '塔城红楼', lat: 46.7400, lng: 82.9800, category: 'attraction' },
    { name: '巴克图口岸', lat: 46.8100, lng: 83.1400, category: 'attraction' },
  ],
  '博尔塔拉': [
    { name: '赛里木湖', lat: 44.5900, lng: 81.2100, category: 'attraction' },
    { name: '博乐五台', lat: 44.8900, lng: 82.0700, category: 'attraction' },
  ],
  '克孜勒苏': [
    { name: '慕士塔格峰', lat: 38.2800, lng: 75.1300, category: 'attraction' },
    { name: '白沙山', lat: 39.5200, lng: 75.1500, category: 'attraction' },
  ],

  // 江苏其他城市
  '镇江': [
    { name: '金山寺', aliases: ['金山'], lat: 32.2400, lng: 119.4200, category: 'attraction' },
    { name: '北固山', lat: 32.2200, lng: 119.4700, category: 'attraction' },
    { name: '焦山', lat: 32.2200, lng: 119.4900, category: 'attraction' },
    { name: '茅山风景区', aliases: ['茅山'], lat: 31.8500, lng: 119.1400, category: 'attraction' },
  ],
  '南通': [
    { name: '狼山风景区', aliases: ['狼山'], lat: 32.0100, lng: 120.8800, category: 'attraction' },
    { name: '濠河风景区', lat: 31.9900, lng: 120.8600, category: 'attraction' },
  ],
  '盐城': [
    { name: '大丰麋鹿自然保护区', aliases: ['麋鹿保护区'], lat: 32.9500, lng: 120.7800, category: 'attraction' },
    { name: '丹顶鹤保护区', lat: 33.2000, lng: 120.5000, category: 'attraction' },
  ],
  '淮安': [
    { name: '周恩来故居', lat: 33.5000, lng: 119.1500, category: 'attraction' },
    { name: '河下古镇', lat: 33.5200, lng: 119.1400, category: 'attraction' },
  ],
  '连云港': [
    { name: '花果山', lat: 34.6100, lng: 119.2900, category: 'attraction' },
    { name: '云台山', lat: 34.6200, lng: 119.2800, category: 'attraction' },
    { name: '连岛', lat: 34.7500, lng: 119.4700, category: 'attraction' },
  ],
  '徐州': [
    { name: '云龙湖', lat: 34.2400, lng: 117.1800, category: 'attraction' },
    { name: '汉文化景区', aliases: ['汉王陵'], lat: 34.2600, lng: 117.2200, category: 'attraction' },
    { name: '马陵山', lat: 34.4700, lng: 118.1400, category: 'attraction' },
  ],
  '宿迁': [
    { name: '洪泽湖', lat: 33.3500, lng: 118.7500, category: 'attraction' },
    { name: '三台山森林公园', lat: 33.9400, lng: 118.3000, category: 'attraction' },
  ],
  '泰州': [
    { name: '溱湖湿地公园', aliases: ['溱湖'], lat: 32.6200, lng: 119.9900, category: 'attraction' },
    { name: '兴化水上森林', lat: 32.9500, lng: 119.7900, category: 'attraction' },
    { name: '泰兴古银杏群落', lat: 32.1700, lng: 120.0100, category: 'attraction' },
  ],
  '湖州': [
    { name: '西塞山', lat: 30.8400, lng: 120.1000, category: 'attraction' },
    { name: '南浔古镇', lat: 30.8800, lng: 120.4200, category: 'attraction' },
    { name: '德清莫干山', aliases: ['莫干山'], lat: 30.5900, lng: 119.8900, category: 'attraction' },
  ],
  '衢州': [
    { name: '江郎山', lat: 28.5900, lng: 118.4700, category: 'attraction' },
    { name: '廿八都古镇', lat: 28.4800, lng: 118.4200, category: 'attraction' },
    { name: '开化根宫佛国', lat: 29.0300, lng: 118.4000, category: 'attraction' },
  ],
  '丽水': [
    { name: '缙云仙都', aliases: ['仙都'], lat: 28.6600, lng: 120.0900, category: 'attraction' },
    { name: '云和梯田', lat: 28.1200, lng: 119.5700, category: 'attraction' },
    { name: '龙泉青瓷博物馆', lat: 28.0700, lng: 119.1400, category: 'attraction' },
  ],
  '温州': [
    { name: '楠溪江', lat: 28.4000, lng: 120.6700, category: 'attraction' },
    { name: '雁荡山', lat: 28.3500, lng: 120.9800, category: 'attraction' },
    { name: '洞头岛', lat: 27.8400, lng: 121.1600, category: 'attraction' },
  ],
  '台州': [
    { name: '天台山', lat: 29.1400, lng: 121.0200, category: 'attraction' },
    { name: '神仙居', lat: 28.7600, lng: 120.7200, category: 'attraction' },
    { name: '长屿硐天', lat: 28.4400, lng: 121.4300, category: 'attraction' },
  ],

  // 山东其他城市
  '潍坊': [
    { name: '青州古城', aliases: ['青州'], lat: 36.6900, lng: 118.4800, category: 'attraction' },
    { name: '风筝博物馆', lat: 36.7100, lng: 119.1600, category: 'attraction' },
    { name: '沂山风景区', aliases: ['沂山'], lat: 36.1500, lng: 118.5300, category: 'attraction' },
  ],
  '淄博': [
    { name: '齐国故城', lat: 36.8500, lng: 118.3500, category: 'attraction' },
    { name: '蒲松龄故居', lat: 36.7200, lng: 118.0400, category: 'attraction' },
    { name: '马踏湖', lat: 36.9100, lng: 118.0900, category: 'attraction' },
  ],
  '临沂': [
    { name: '蒙山', lat: 35.5500, lng: 117.6500, category: 'attraction' },
    { name: '沂水溶洞', lat: 35.6200, lng: 118.5800, category: 'attraction' },
    { name: '竹泉村', lat: 36.0000, lng: 118.1800, category: 'attraction' },
  ],
  '日照': [
    { name: '日照万平口海滨', aliases: ['万平口'], lat: 35.3700, lng: 119.4600, category: 'attraction' },
    { name: '五莲山', lat: 35.8600, lng: 119.2100, category: 'attraction' },
  ],
  '菏泽': [
    { name: '曹州牡丹园', aliases: ['牡丹园'], lat: 35.2500, lng: 115.4700, category: 'attraction' },
    { name: '菏泽古城', lat: 35.2400, lng: 115.4600, category: 'attraction' },
  ],
  '聊城': [
    { name: '光岳楼', lat: 36.4600, lng: 115.9900, category: 'attraction' },
    { name: '东昌古城', lat: 36.4500, lng: 115.9800, category: 'attraction' },
    { name: '阳谷景阳冈', lat: 36.1200, lng: 115.7900, category: 'attraction' },
  ],
  '德州': [
    { name: '德州苏禄国王墓', lat: 37.4600, lng: 116.2900, category: 'attraction' },
  ],
  '枣庄': [
    { name: '台儿庄古城', aliases: ['台儿庄'], lat: 34.5600, lng: 117.7300, category: 'attraction' },
    { name: '抱犊崮', lat: 34.9300, lng: 117.5800, category: 'attraction' },
  ],

  // 河南其他城市
  '南阳': [
    { name: '南阳汉画馆', lat: 32.9900, lng: 112.5300, category: 'attraction' },
    { name: '宝天曼', lat: 33.4000, lng: 111.9300, category: 'attraction' },
    { name: '西峡恐龙遗址园', lat: 33.3100, lng: 111.4900, category: 'attraction' },
  ],
  '信阳': [
    { name: '鸡公山', lat: 31.8200, lng: 114.0700, category: 'attraction' },
    { name: '南湾湖', lat: 32.1700, lng: 114.1100, category: 'attraction' },
    { name: '灵山', lat: 31.7600, lng: 115.3200, category: 'attraction' },
  ],
  '许昌': [
    { name: '神垕古镇', aliases: ['神垕'], lat: 34.0700, lng: 113.5500, category: 'attraction' },
    { name: '许昌曹魏古城', lat: 34.0300, lng: 113.8300, category: 'attraction' },
  ],
  '三门峡': [
    { name: '黄河小浪底', aliases: ['小浪底'], lat: 35.0800, lng: 112.4300, category: 'attraction' },
    { name: '函谷关', lat: 34.5200, lng: 110.8700, category: 'attraction' },
    { name: '虢国车马坑博物馆', lat: 34.7700, lng: 111.2000, category: 'attraction' },
  ],
  '平顶山': [
    { name: '石人山', aliases: ['尧山'], lat: 33.7900, lng: 112.3600, category: 'attraction' },
    { name: '汝窑博物馆', lat: 34.0300, lng: 112.6900, category: 'attraction' },
  ],
  '新乡': [
    { name: '八里沟', lat: 35.4200, lng: 113.8300, category: 'attraction' },
    { name: '万仙山', lat: 35.5400, lng: 113.8800, category: 'attraction' },
  ],
  '商丘': [
    { name: '芒砀山', aliases: ['芒山'], lat: 34.3300, lng: 116.3000, category: 'attraction' },
    { name: '归德古城', lat: 34.4500, lng: 115.6500, category: 'attraction' },
  ],

  // 湖北其他城市
  '荆州': [
    { name: '荆州古城', aliases: ['荆州城墙'], lat: 30.3500, lng: 112.2400, category: 'attraction' },
    { name: '三峡人家', lat: 30.8800, lng: 111.0600, category: 'attraction' },
  ],
  '襄阳': [
    { name: '古隆中', lat: 32.0800, lng: 112.0100, category: 'attraction' },
    { name: '襄阳城墙', lat: 32.0100, lng: 112.1200, category: 'attraction' },
    { name: '鹿门山', lat: 32.1200, lng: 112.2500, category: 'attraction' },
  ],
  '黄冈': [
    { name: '大别山', lat: 30.9300, lng: 115.8500, category: 'attraction' },
    { name: '红安革命纪念馆', lat: 31.2800, lng: 114.6200, category: 'attraction' },
  ],
  '咸宁': [
    { name: '赤壁古战场', aliases: ['赤壁'], lat: 29.7200, lng: 113.8700, category: 'attraction' },
    { name: '九宫山', lat: 29.3900, lng: 114.5100, category: 'attraction' },
  ],
  '孝感': [
    { name: '双峰山', lat: 31.2000, lng: 114.0800, category: 'attraction' },
  ],

  // 湖南其他城市
  '湘潭': [
    { name: '韶山毛泽东故居', aliases: ['韶山'], lat: 27.9200, lng: 112.5300, category: 'attraction' },
    { name: '彭德怀纪念馆', lat: 27.5900, lng: 112.4800, category: 'attraction' },
  ],
  '益阳': [
    { name: '桃花源', lat: 29.1200, lng: 111.5500, category: 'attraction' },
    { name: '安化黑茶体验园', lat: 28.3600, lng: 111.1900, category: 'attraction' },
  ],
  '永州': [
    { name: '九疑山', lat: 25.3500, lng: 111.9500, category: 'attraction' },
    { name: '东安舜皇山', lat: 26.4600, lng: 111.2100, category: 'attraction' },
  ],
  '怀化': [
    { name: '黔阳古城', lat: 27.1000, lng: 109.9400, category: 'attraction' },
    { name: '通道侗族文化景区', aliases: ['通道'], lat: 26.1600, lng: 109.7800, category: 'attraction' },
  ],
  '娄底': [
    { name: '梅山文化园', lat: 27.7000, lng: 111.9900, category: 'attraction' },
  ],
  '邵阳': [
    { name: '崀山', lat: 26.4800, lng: 110.9400, category: 'attraction' },
    { name: '云山国家森林公园', lat: 26.5000, lng: 111.4500, category: 'attraction' },
  ],

  // 广东其他城市
  '潮州': [
    { name: '广济桥', aliases: ['湘子桥'], lat: 23.6600, lng: 116.6400, category: 'attraction' },
    { name: '潮州古城', lat: 23.6600, lng: 116.6300, category: 'attraction' },
    { name: '开元寺', lat: 23.6600, lng: 116.6300, category: 'attraction' },
  ],
  '梅州': [
    { name: '雁南飞茶田度假村', aliases: ['雁南飞'], lat: 24.3100, lng: 116.1100, category: 'attraction' },
    { name: '客天下旅游产业园', lat: 24.2900, lng: 116.1400, category: 'attraction' },
    { name: '围龙屋', lat: 24.3200, lng: 116.1100, category: 'attraction' },
  ],
  '肇庆': [
    { name: '鼎湖山', lat: 23.1800, lng: 112.5600, category: 'attraction' },
    { name: '七星岩', lat: 23.0700, lng: 112.4600, category: 'attraction' },
    { name: '星湖', lat: 23.0600, lng: 112.4700, category: 'attraction' },
  ],
  '江门': [
    { name: '开平碉楼', aliases: ['碉楼'], lat: 22.3700, lng: 112.6900, category: 'attraction' },
    { name: '赤坎古镇', lat: 22.3600, lng: 112.8700, category: 'attraction' },
  ],
  '茂名': [
    { name: '放鸡岛', lat: 21.0800, lng: 111.0600, category: 'attraction' },
    { name: '中国第一滩', lat: 21.4200, lng: 110.6700, category: 'attraction' },
  ],
  '湛江': [
    { name: '特呈岛', lat: 21.2200, lng: 110.5600, category: 'attraction' },
    { name: '湖光岩', lat: 21.1700, lng: 110.2500, category: 'attraction' },
  ],
  '揭阳': [
    { name: '揭阳学宫', lat: 23.5500, lng: 116.3800, category: 'attraction' },
    { name: '炮台鳄鱼岛', lat: 23.5800, lng: 116.2900, category: 'attraction' },
  ],
  '惠州': [
    { name: '惠州西湖', lat: 23.1100, lng: 114.4100, category: 'attraction' },
    { name: '巽寮湾', lat: 22.7200, lng: 114.8400, category: 'attraction' },
    { name: '双月湾', lat: 22.7400, lng: 114.8600, category: 'attraction' },
  ],
  '清远': [
    { name: '连州地下河', lat: 24.7300, lng: 112.3700, category: 'attraction' },
    { name: '英德石门台', lat: 24.2300, lng: 113.3200, category: 'attraction' },
  ],

  // 广西其他城市
  '百色': [
    { name: '靖西通灵大峡谷', aliases: ['通灵峡谷'], lat: 23.1200, lng: 106.4200, category: 'attraction' },
    { name: '乐业天坑群', aliases: ['大石围天坑'], lat: 24.7800, lng: 106.5500, category: 'attraction' },
  ],
  '河池': [
    { name: '凤山地下河', lat: 24.5400, lng: 107.0200, category: 'attraction' },
    { name: '罗城仫佬族文化苑', lat: 24.7600, lng: 108.9000, category: 'attraction' },
  ],
  '崇左': [
    { name: '德天瀑布', lat: 22.9200, lng: 106.7300, category: 'attraction' },
    { name: '明仕田园', lat: 22.7800, lng: 107.0400, category: 'attraction' },
    { name: '花山岩画', aliases: ['宁明花山'], lat: 22.4500, lng: 107.2400, category: 'attraction' },
  ],
  '钦州': [
    { name: '三娘湾', lat: 21.7200, lng: 108.5900, category: 'attraction' },
    { name: '坭兴陶博物馆', lat: 21.9800, lng: 108.6500, category: 'attraction' },
  ],
  '防城港': [
    { name: '金滩', lat: 21.6800, lng: 108.3500, category: 'attraction' },
    { name: '上思十万大山', lat: 21.9600, lng: 107.9800, category: 'attraction' },
  ],
  '贵港': [
    { name: '平天山', lat: 23.5000, lng: 110.0500, category: 'attraction' },
  ],
  '贺州': [
    { name: '黄姚古镇', lat: 24.3300, lng: 111.0800, category: 'attraction' },
    { name: '姑婆山', lat: 24.6400, lng: 111.4000, category: 'attraction' },
  ],
  '来宾': [
    { name: '金秀大瑶山', aliases: ['圣堂山'], lat: 24.1200, lng: 110.0500, category: 'attraction' },
  ],
  '梧州': [
    { name: '骑楼城', lat: 23.4800, lng: 111.2800, category: 'district' },
    { name: '龙母庙', lat: 23.4800, lng: 111.2700, category: 'attraction' },
  ],

  // 海南其他城市
  '儋州': [
    { name: '热带植物园', lat: 19.5300, lng: 109.5800, category: 'attraction' },
    { name: '东坡书院', lat: 19.6200, lng: 109.5800, category: 'attraction' },
  ],
  '文昌': [
    { name: '文昌航天发射场', lat: 19.6100, lng: 110.9500, category: 'attraction' },
    { name: '铜鼓岭', lat: 19.8200, lng: 110.9800, category: 'attraction' },
  ],
  '琼海': [
    { name: '博鳌亚洲论坛', aliases: ['博鳌'], lat: 19.1700, lng: 110.5800, category: 'attraction' },
    { name: '万泉河', lat: 19.2700, lng: 110.4900, category: 'attraction' },
  ],
  '万宁': [
    { name: '石梅湾', lat: 18.6800, lng: 110.3100, category: 'attraction' },
    { name: '日月湾', lat: 18.7700, lng: 110.3200, category: 'attraction' },
  ],

  // 贵州其他城市
  '铜仁': [
    { name: '梵净山', lat: 27.9800, lng: 108.7000, category: 'attraction' },
    { name: '苗王城', lat: 27.7800, lng: 109.4500, category: 'attraction' },
  ],
  '六盘水': [
    { name: '乌蒙山国家地质公园', aliases: ['野玉海'], lat: 26.3700, lng: 104.8700, category: 'attraction' },
    { name: '六盘水明湖湿地公园', lat: 26.5900, lng: 104.8500, category: 'attraction' },
  ],
  '黔南': [
    { name: '平塘天眼', aliases: ['中国天眼', '五百米口径球面射电望远镜'], lat: 25.6500, lng: 106.8500, category: 'attraction' },
  ],

  // 云南其他城市
  '保山': [
    { name: '腾冲热海', aliases: ['热海'], lat: 25.0200, lng: 98.4900, category: 'attraction' },
    { name: '腾冲火山地热国家地质公园', lat: 25.0600, lng: 98.5300, category: 'attraction' },
    { name: '和顺古镇', lat: 25.0000, lng: 98.4600, category: 'attraction' },
  ],
  '曲靖': [
    { name: '珠江源', lat: 25.9100, lng: 104.1800, category: 'attraction' },
    { name: '罗平油菜花海', aliases: ['罗平'], lat: 24.8900, lng: 104.3100, category: 'attraction' },
  ],
  '昭通': [
    { name: '大山包自然保护区', lat: 27.4900, lng: 103.2400, category: 'attraction' },
    { name: '威信扎西会议遗址', lat: 27.9600, lng: 105.0700, category: 'attraction' },
  ],
  '普洱': [
    { name: '景迈山', aliases: ['景迈古茶山'], lat: 22.1800, lng: 99.9600, category: 'attraction' },
    { name: '糯扎渡', lat: 22.7600, lng: 100.6900, category: 'attraction' },
  ],
  '临沧': [
    { name: '翁丁佤族原生态部落', aliases: ['翁丁'], lat: 23.6700, lng: 99.3900, category: 'attraction' },
    { name: '临沧大雪山', lat: 23.8900, lng: 99.9300, category: 'attraction' },
  ],
  '楚雄': [
    { name: '元谋人遗址', aliases: ['元谋土林'], lat: 25.7100, lng: 101.8800, category: 'attraction' },
    { name: '禄丰恐龙国家地质公园', lat: 25.1300, lng: 102.0800, category: 'attraction' },
  ],
  '红河': [
    { name: '元阳哈尼梯田', aliases: ['哈尼梯田'], lat: 23.1200, lng: 102.7400, category: 'attraction' },
    { name: '建水古城', lat: 23.6200, lng: 102.8200, category: 'attraction' },
    { name: '个旧锡都', lat: 23.3600, lng: 103.1500, category: 'attraction' },
  ],
  '文山': [
    { name: '普者黑', lat: 23.9900, lng: 104.3800, category: 'attraction' },
    { name: '老山林场', lat: 22.6900, lng: 104.2300, category: 'attraction' },
  ],
  '德宏': [
    { name: '瑞丽姐告口岸', aliases: ['瑞丽'], lat: 24.0200, lng: 97.8600, category: 'attraction' },
    { name: '陇川户撒', lat: 24.2200, lng: 97.7900, category: 'attraction' },
  ],
  '怒江': [
    { name: '独龙江', lat: 27.9800, lng: 98.3100, category: 'attraction' },
    { name: '片马口岸', lat: 25.9800, lng: 98.6300, category: 'attraction' },
  ],

  // 西藏其他城市
  '山南': [
    { name: '雍布拉康', lat: 29.0600, lng: 91.7700, category: 'attraction' },
    { name: '藏王墓', lat: 29.1000, lng: 91.7500, category: 'attraction' },
    { name: '昌珠寺', lat: 29.0700, lng: 91.7600, category: 'attraction' },
  ],
  '昌都': [
    { name: '卡若遗址', lat: 31.1400, lng: 97.1700, category: 'attraction' },
    { name: '强巴林寺', lat: 31.1400, lng: 97.1800, category: 'attraction' },
    { name: '来古冰川', lat: 29.7000, lng: 96.0000, category: 'attraction' },
  ],
  '那曲': [
    { name: '色林错', lat: 31.8300, lng: 88.9700, category: 'attraction' },
    { name: '双湖特别区', lat: 33.1300, lng: 89.2000, category: 'attraction' },
  ],
  '阿里': [
    { name: '冈仁波齐峰', aliases: ['神山'], lat: 31.0700, lng: 81.3100, category: 'attraction' },
    { name: '玛旁雍错', aliases: ['圣湖'], lat: 30.6300, lng: 81.5500, category: 'attraction' },
    { name: '古格王国遗址', lat: 31.5600, lng: 79.8100, category: 'attraction' },
  ],

  // 甘肃其他城市
  '庆阳': [
    { name: '北石窟寺', lat: 35.6700, lng: 107.5800, category: 'attraction' },
    { name: '周祖陵', lat: 35.7300, lng: 107.6400, category: 'attraction' },
  ],
  '平凉': [
    { name: '崆峒山', lat: 35.5400, lng: 106.6700, category: 'attraction' },
  ],
  '定西': [
    { name: '渭河源', lat: 35.0000, lng: 104.8500, category: 'attraction' },
    { name: '马家窑遗址', lat: 35.6300, lng: 103.8500, category: 'attraction' },
  ],
  '陇南': [
    { name: '官鹅沟', lat: 34.0700, lng: 104.6400, category: 'attraction' },
    { name: '成县西狭颂', lat: 33.7500, lng: 105.7200, category: 'attraction' },
  ],
  '白银': [
    { name: '黄河石林', lat: 36.8600, lng: 104.5000, category: 'attraction' },
  ],
  '临夏': [
    { name: '积石山', lat: 35.7200, lng: 102.8700, category: 'attraction' },
    { name: '八坊十三巷', lat: 35.6000, lng: 103.2100, category: 'district' },
  ],
  '甘南': [
    { name: '拉卜楞寺', lat: 35.1900, lng: 102.5100, category: 'attraction' },
    { name: '扎尕那', lat: 34.4700, lng: 103.5400, category: 'attraction' },
    { name: '郎木寺', lat: 34.0700, lng: 102.6400, category: 'attraction' },
  ],

  // 青海其他城市
  '海东': [
    { name: '互助土族故土园', aliases: ['互助土乡风情'], lat: 36.8400, lng: 101.9600, category: 'attraction' },
    { name: '瞿昙寺', lat: 36.3800, lng: 102.3200, category: 'attraction' },
  ],
  '海北': [
    { name: '门源油菜花', aliases: ['门源'], lat: 37.3700, lng: 101.6200, category: 'attraction' },
    { name: '祁连草原', lat: 38.1800, lng: 100.2500, category: 'attraction' },
  ],
  '海南': [
    { name: '贵德国家地质公园', aliases: ['贵德'], lat: 36.0500, lng: 101.4300, category: 'attraction' },
    { name: '龙羊峡', lat: 36.1000, lng: 100.9800, category: 'attraction' },
  ],
  '黄南': [
    { name: '热贡唐卡艺术区', aliases: ['隆务寺'], lat: 35.5200, lng: 102.0200, category: 'attraction' },
    { name: '坎布拉国家地质公园', lat: 35.9300, lng: 102.4000, category: 'attraction' },
  ],
  '果洛': [
    { name: '年保玉则', lat: 33.5400, lng: 100.9600, category: 'attraction' },
    { name: '格萨尔王城', lat: 33.7600, lng: 100.3100, category: 'attraction' },
  ],
  '玉树': [
    { name: '三江源国家公园', lat: 33.0000, lng: 96.0000, category: 'attraction' },
    { name: '结古寺', lat: 32.9900, lng: 97.0100, category: 'attraction' },
  ],

  // 宁夏其他城市
  '石嘴山': [
    { name: '贺兰山国家森林公园', lat: 38.8600, lng: 105.9800, category: 'attraction' },
    { name: '星海湖', lat: 39.0200, lng: 106.3900, category: 'attraction' },
  ],
  '吴忠': [
    { name: '盐湖公园', lat: 37.9800, lng: 106.2200, category: 'attraction' },
    { name: '同心清真大寺', lat: 36.9800, lng: 105.9200, category: 'attraction' },
  ],
  '固原': [
    { name: '须弥山石窟', lat: 36.2000, lng: 106.3200, category: 'attraction' },
    { name: '六盘山国家森林公园', lat: 35.6200, lng: 106.1500, category: 'attraction' },
  ],

  // 陕西其他城市
  '榆林': [
    { name: '红碱淖', lat: 38.4700, lng: 109.8800, category: 'attraction' },
    { name: '统万城遗址', lat: 38.0000, lng: 108.8000, category: 'attraction' },
    { name: '米脂窑洞古城', lat: 37.7500, lng: 110.1800, category: 'attraction' },
  ],
  '安康': [
    { name: '瀛湖生态旅游景区', aliases: ['瀛湖'], lat: 32.6300, lng: 109.2000, category: 'attraction' },
    { name: '南宫山', lat: 32.4100, lng: 108.6000, category: 'attraction' },
  ],
  '商洛': [
    { name: '商洛金丝峡', aliases: ['金丝峡'], lat: 33.9200, lng: 110.1500, category: 'attraction' },
    { name: '天竺山', lat: 33.6600, lng: 110.0600, category: 'attraction' },
  ],
  '铜川': [
    { name: '药王山', lat: 35.0800, lng: 109.0600, category: 'attraction' },
    { name: '照金丹霞地貌', lat: 35.2700, lng: 108.8500, category: 'attraction' },
  ],

  // 港澳台
  '香港': [
    { name: '维多利亚港', aliases: ['维港'], lat: 22.2855, lng: 114.1577, category: 'attraction' },
    { name: '太平山顶', aliases: ['山顶'], lat: 22.2714, lng: 114.1491, category: 'attraction' },
    { name: '旺角', lat: 22.3193, lng: 114.1694, category: 'district' },
    { name: '尖沙咀', lat: 22.2988, lng: 114.1722, category: 'district' },
    { name: '铜锣湾', lat: 22.2796, lng: 114.1837, category: 'district' },
    { name: '兰桂坊', lat: 22.2812, lng: 114.1547, category: 'district' },
    { name: '香港迪士尼乐园', aliases: ['香港迪士尼'], lat: 22.3130, lng: 114.0413, category: 'attraction' },
    { name: '海洋公园', lat: 22.2489, lng: 114.1727, category: 'attraction' },
    { name: '天坛大佛', aliases: ['宝莲禅寺'], lat: 22.2540, lng: 113.9050, category: 'attraction' },
    { name: '西九龙文化区', aliases: ['故宫文化博物馆'], lat: 22.3020, lng: 114.1587, category: 'district' },
    { name: '星光大道', lat: 22.2938, lng: 114.1725, category: 'attraction' },
  ],
  '澳门': [
    { name: '大三巴牌坊', lat: 22.1969, lng: 113.5394, category: 'attraction' },
    { name: '葡京酒店', aliases: ['澳门葡京'], lat: 22.1900, lng: 113.5400, category: 'district' },
    { name: '官也街', lat: 22.1697, lng: 113.5568, category: 'district' },
    { name: '妈阁庙', lat: 22.1861, lng: 113.5367, category: 'attraction' },
    { name: '澳门旅游塔', lat: 22.1830, lng: 113.5462, category: 'attraction' },
    { name: '路环黑沙海滩', aliases: ['黑沙滩'], lat: 22.1264, lng: 113.5567, category: 'attraction' },
    { name: '议事亭前地', aliases: ['澳门议事亭'], lat: 22.1939, lng: 113.5398, category: 'district' },
  ],
  '台北': [
    { name: '台北101', aliases: ['台北一零一'], lat: 25.0338, lng: 121.5645, category: 'attraction' },
    { name: '故宫博物院', aliases: ['台北故宫'], lat: 25.1023, lng: 121.5485, category: 'attraction' },
    { name: '西门町', lat: 25.0422, lng: 121.5077, category: 'district' },
    { name: '饶河街观光夜市', aliases: ['饶河夜市'], lat: 25.0508, lng: 121.5775, category: 'district' },
    { name: '淡水老街', aliases: ['淡水'], lat: 25.1699, lng: 121.4397, category: 'district' },
    { name: '九份老街', aliases: ['九份'], lat: 25.1093, lng: 121.8443, category: 'attraction' },
    { name: '龙山寺', lat: 25.0371, lng: 121.4999, category: 'attraction' },
    { name: '中正纪念堂', lat: 25.0360, lng: 121.5202, category: 'attraction' },
    { name: '阳明山国家公园', aliases: ['阳明山'], lat: 25.1600, lng: 121.5500, category: 'attraction' },
  ],
  '台南': [
    { name: '赤崁楼', lat: 22.9982, lng: 120.2002, category: 'attraction' },
    { name: '安平古堡', lat: 23.0000, lng: 120.1620, category: 'attraction' },
    { name: '台南孔庙', lat: 22.9922, lng: 120.2026, category: 'attraction' },
    { name: '花园夜市', lat: 22.9867, lng: 120.2234, category: 'district' },
  ],
  '台中': [
    { name: '日月潭', lat: 23.8628, lng: 120.9179, category: 'attraction' },
    { name: '清境农场', lat: 24.0900, lng: 121.1700, category: 'attraction' },
    { name: '逢甲夜市', lat: 24.1793, lng: 120.6453, category: 'district' },
    { name: '台中公园', lat: 24.1477, lng: 120.6787, category: 'attraction' },
  ],
  '高雄': [
    { name: '旗津岛', aliases: ['旗津'], lat: 22.6170, lng: 120.2712, category: 'attraction' },
    { name: '佛光山', lat: 22.7400, lng: 120.5600, category: 'attraction' },
    { name: '六合夜市', lat: 22.6317, lng: 120.3038, category: 'district' },
    { name: '美丽岛', lat: 22.6274, lng: 120.3013, category: 'district' },
  ],
  '花莲': [
    { name: '太鲁阁国家公园', aliases: ['太鲁阁'], lat: 24.1500, lng: 121.6200, category: 'attraction' },
    { name: '七星潭', lat: 24.0200, lng: 121.6200, category: 'attraction' },
  ],
  '阿里山': [
    { name: '阿里山国家风景区', aliases: ['阿里山'], lat: 23.5100, lng: 120.8100, category: 'attraction' },
    { name: '玉山', lat: 23.4700, lng: 120.9600, category: 'attraction' },
  ],

  // 四川其他城市补充
  '广安': [
    { name: '邓小平故里', aliases: ['邓小平纪念馆'], lat: 30.5100, lng: 106.6400, category: 'attraction' },
    { name: '华蓥山', lat: 30.2100, lng: 106.8300, category: 'attraction' },
  ],
  '雅安': [
    { name: '碧峰峡', lat: 30.0800, lng: 103.1200, category: 'attraction' },
    { name: '牛背山', lat: 29.9800, lng: 102.4300, category: 'attraction' },
  ],
  '眉山': [
    { name: '峨眉山', aliases: ['峨眉'], lat: 29.6000, lng: 103.3300, category: 'attraction' },
    { name: '三苏祠', lat: 30.0800, lng: 103.8300, category: 'attraction' },
  ],
  '广元': [
    { name: '剑门关', aliases: ['剑阁'], lat: 32.2300, lng: 105.5300, category: 'attraction' },
    { name: '翠云廊', lat: 32.0700, lng: 105.5700, category: 'attraction' },
  ],
  '泸州': [
    { name: '泸州老窖', lat: 28.8700, lng: 105.4400, category: 'attraction' },
    { name: '黄荆老林', lat: 28.3000, lng: 105.1500, category: 'attraction' },
    { name: '尧坝古镇', lat: 28.6500, lng: 105.6800, category: 'attraction' },
  ],
  '绵阳': [
    { name: '北川羌族文化旅游区', aliases: ['北川'], lat: 31.8600, lng: 104.5100, category: 'attraction' },
    { name: '平武报恩寺', lat: 32.4100, lng: 104.5400, category: 'attraction' },
  ],
  '攀枝花': [
    { name: '二滩水库', lat: 26.8000, lng: 101.9800, category: 'attraction' },
    { name: '格萨拉生态旅游区', lat: 27.0000, lng: 101.4300, category: 'attraction' },
  ],

  // 重庆补充
  '铜仁': [
    { name: '梵净山', lat: 27.9800, lng: 108.7000, category: 'attraction' },
  ],

  // 浙江其他
  '嘉兴': [
    { name: '西塘', lat: 30.9500, lng: 120.8833, category: 'attraction' },
    { name: '嘉兴南湖', aliases: ['南湖'], lat: 30.7455, lng: 120.7600, category: 'attraction' },
  ],

  // 安徽其他城市
  '芜湖': [
    { name: '赭山公园', lat: 31.3400, lng: 118.3800, category: 'attraction' },
    { name: '芜湖方特旅游区', aliases: ['方特'], lat: 31.2700, lng: 118.3400, category: 'attraction' },
  ],
  '蚌埠': [
    { name: '龙子湖', lat: 32.9200, lng: 117.3800, category: 'attraction' },
    { name: '垓下遗址', lat: 33.0100, lng: 117.2000, category: 'attraction' },
  ],
  '安庆': [
    { name: '天柱山', lat: 30.7400, lng: 116.4700, category: 'attraction' },
    { name: '花亭湖', lat: 30.8800, lng: 116.2700, category: 'attraction' },
  ],
  '滁州': [
    { name: '醉翁亭', lat: 32.3100, lng: 118.3000, category: 'attraction' },
    { name: '明皇陵', aliases: ['凤阳皇陵'], lat: 32.8600, lng: 117.5500, category: 'attraction' },
  ],
  '六安': [
    { name: '天堂寨', lat: 31.3200, lng: 115.8800, category: 'attraction' },
    { name: '万佛湖', lat: 31.6500, lng: 116.2800, category: 'attraction' },
  ],
  '亳州': [
    { name: '曹操地下运兵道', lat: 33.8500, lng: 115.7800, category: 'attraction' },
    { name: '华祖庵', lat: 33.8500, lng: 115.7900, category: 'attraction' },
  ],
  '宣城': [
    { name: '宣城敬亭山', aliases: ['敬亭山'], lat: 30.9500, lng: 118.8000, category: 'attraction' },
    { name: '桃花潭', lat: 30.4000, lng: 118.2000, category: 'attraction' },
  ],
  '宿州': [
    { name: '皇藏峪', lat: 33.8000, lng: 117.1700, category: 'attraction' },
  ],
  '马鞍山': [
    { name: '采石矶', lat: 31.6900, lng: 118.4600, category: 'attraction' },
  ],
  '池州': [
    { name: '九华山', lat: 30.5000, lng: 117.8000, category: 'attraction' },
  ],
  '铜陵': [
    { name: '天井湖公园', lat: 30.9300, lng: 117.8100, category: 'attraction' },
  ],
  '阜阳': [
    { name: '颍州西湖', lat: 32.9300, lng: 115.8000, category: 'attraction' },
  ],

  // 福建其他城市
  '漳州': [
    { name: '土楼王子', lat: 24.7200, lng: 117.0200, category: 'attraction' },
    { name: '漳州云洞岩', lat: 24.5100, lng: 117.6900, category: 'attraction' },
  ],
  '泉州': [
    { name: '开元寺', lat: 24.9100, lng: 118.5900, category: 'attraction' },
    { name: '洛阳桥', lat: 24.9400, lng: 118.7300, category: 'attraction' },
    { name: '清源山', lat: 24.9500, lng: 118.6300, category: 'attraction' },
    { name: '崇武古城', lat: 24.8900, lng: 118.9200, category: 'attraction' },
  ],
  '莆田': [
    { name: '湄洲岛', lat: 25.1100, lng: 119.1100, category: 'attraction' },
    { name: '妈祖庙', lat: 25.1100, lng: 119.1100, category: 'attraction' },
  ],
  '龙岩': [
    { name: '永定土楼', aliases: ['土楼'], lat: 24.7700, lng: 116.9400, category: 'attraction' },
    { name: '长汀古城', lat: 25.8400, lng: 116.3500, category: 'attraction' },
    { name: '古田会议旧址', lat: 25.5800, lng: 116.8800, category: 'attraction' },
  ],
  '三明': [
    { name: '泰宁丹霞地貌', aliases: ['泰宁'], lat: 26.9000, lng: 117.2000, category: 'attraction' },
    { name: '玉华洞', lat: 26.1900, lng: 117.3800, category: 'attraction' },
  ],
  '宁德': [
    { name: '太姥山', lat: 27.1000, lng: 120.2100, category: 'attraction' },
    { name: '白水洋', lat: 26.8400, lng: 119.0000, category: 'attraction' },
    { name: '霞浦滩涂', aliases: ['霞浦'], lat: 26.8900, lng: 120.0200, category: 'attraction' },
  ],
  '南平': [
    { name: '武夷山', lat: 27.7200, lng: 117.9800, category: 'attraction' },
    { name: '大安源', lat: 27.1000, lng: 118.2000, category: 'attraction' },
  ],

  // 江西其他城市
  '景德镇': [
    { name: '陶溪川陶瓷文化创意区', aliases: ['陶溪川'], lat: 29.2800, lng: 117.1800, category: 'district' },
    { name: '瓷都古窑博览区', lat: 29.2700, lng: 117.2000, category: 'attraction' },
    { name: '浮梁古县衙', lat: 29.3700, lng: 117.2200, category: 'attraction' },
  ],
  '萍乡': [
    { name: '武功山', lat: 27.4800, lng: 114.1500, category: 'attraction' },
  ],
  '赣州': [
    { name: '通天岩石窟', lat: 25.8300, lng: 114.8900, category: 'attraction' },
    { name: '兴国将军园', lat: 26.3400, lng: 115.3600, category: 'attraction' },
    { name: '瑞金红色旧址', aliases: ['瑞金'], lat: 25.8900, lng: 116.0200, category: 'attraction' },
  ],
  '吉安': [
    { name: '井冈山', lat: 26.5700, lng: 114.2900, category: 'attraction' },
    { name: '庐陵文化生态园', lat: 27.1100, lng: 114.9900, category: 'attraction' },
  ],
  '新余': [
    { name: '仙女湖', lat: 27.7100, lng: 114.9200, category: 'attraction' },
  ],
  '宜春': [
    { name: '明月山', lat: 27.6900, lng: 114.3500, category: 'attraction' },
    { name: '三爪仑', lat: 28.6900, lng: 114.8000, category: 'attraction' },
  ],
  '上饶': [
    { name: '三清山', lat: 28.9000, lng: 118.0000, category: 'attraction' },
    { name: '婺源', lat: 29.2500, lng: 117.8600, category: 'attraction' },
    { name: '龟峰', lat: 28.3100, lng: 117.3800, category: 'attraction' },
  ],
  '抚州': [
    { name: '龙虎山', lat: 28.0100, lng: 117.0200, category: 'attraction' },
    { name: '南丰傩舞', lat: 27.2100, lng: 116.5200, category: 'attraction' },
  ],
  '鹰潭': [
    { name: '龙虎山', lat: 28.0100, lng: 117.0200, category: 'attraction' },
  ],

  // 辽宁其他城市
  '鞍山': [
    { name: '千山', lat: 41.0400, lng: 123.0900, category: 'attraction' },
    { name: '玉佛苑', lat: 41.1500, lng: 122.9900, category: 'attraction' },
  ],
  '抚顺': [
    { name: '赫图阿拉城', aliases: ['赫图阿拉'], lat: 41.7800, lng: 124.9200, category: 'attraction' },
    { name: '抚顺战犯管理所', lat: 41.8900, lng: 123.9500, category: 'attraction' },
  ],
  '朝阳': [
    { name: '鸟化石国家地质公园', aliases: ['鸟化石'], lat: 41.5700, lng: 120.4400, category: 'attraction' },
    { name: '朝阳北塔', lat: 41.5700, lng: 120.4600, category: 'attraction' },
  ],
  '葫芦岛': [
    { name: '兴城古城', lat: 40.6100, lng: 120.7400, category: 'attraction' },
    { name: '菊花岛', lat: 40.7200, lng: 120.8100, category: 'attraction' },
  ],

  // 吉林其他城市
  '四平': [
    { name: '叶赫那拉城', lat: 43.3500, lng: 124.3800, category: 'attraction' },
  ],
  '通化': [
    { name: '集安高句丽遗址', aliases: ['高句丽'], lat: 41.1300, lng: 126.1800, category: 'attraction' },
    { name: '仙峰岭', lat: 41.9100, lng: 127.2100, category: 'attraction' },
  ],
  '白城': [
    { name: '向海自然保护区', lat: 45.2500, lng: 122.3500, category: 'attraction' },
  ],

  // 黑龙江其他城市
  '佳木斯': [
    { name: '三江自然保护区', lat: 48.0100, lng: 134.1200, category: 'attraction' },
  ],
  '大庆': [
    { name: '铁人王进喜纪念馆', aliases: ['铁人纪念馆'], lat: 46.5900, lng: 125.0200, category: 'attraction' },
  ],
  '绥化': [
    { name: '庆安国家湿地公园', lat: 46.8700, lng: 127.5000, category: 'attraction' },
  ],
}

// Simple pinyin mapping for common characters (basic approach)
function toPinyin(name) {
  // For this dataset, we'll generate pinyin from the known names
  // Using a simple mapping approach - city names are well-known
  const map = {
    '北京': 'beijing', '天津': 'tianjin', '上海': 'shanghai', '重庆': 'chongqing',
    '石家庄': 'shijiazhuang', '唐山': 'tangshan', '保定': 'baoding', '秦皇岛': 'qinhuangdao',
    '邯郸': 'handan', '邢台': 'xingtai', '张家口': 'zhangjiakou', '承德': 'chengde',
    '沧州': 'cangzhou', '廊坊': 'langfang', '衡水': 'hengshui',
    '太原': 'taiyuan', '大同': 'datong', '临汾': 'linfen', '运城': 'yuncheng',
    '晋中': 'jinzhong', '长治': 'changzhi', '晋城': 'jincheng', '忻州': 'xinzhou',
    '朔州': 'shuozhou', '阳泉': 'yangquan', '吕梁': 'lvliang',
    '呼和浩特': 'huhehaote', '包头': 'baotou', '鄂尔多斯': 'eerduosi', '赤峰': 'chifeng',
    '呼伦贝尔': 'hulunbeier', '通辽': 'tongliao', '乌兰察布': 'wulanchabu',
    '巴彦淖尔': 'bayannaoer', '乌海': 'wuhai', '锡林郭勒': 'xilinguole',
    '兴安盟': 'xinganmeng', '阿拉善': 'alashan',
    '沈阳': 'shenyang', '大连': 'dalian', '鞍山': 'anshan', '抚顺': 'fushun',
    '本溪': 'benxi', '丹东': 'dandong', '锦州': 'jinzhou', '营口': 'yingkou',
    '阜新': 'fuxin', '辽阳': 'liaoyang', '盘锦': 'panjin', '铁岭': 'tieling',
    '朝阳': 'chaoyang', '葫芦岛': 'huludao',
    '长春': 'changchun', '吉林市': 'jilinshi', '四平': 'siping', '辽源': 'liaoyuan',
    '通化': 'tonghua', '白山': 'baishan', '松原': 'songyuan', '白城': 'baicheng',
    '延边': 'yanbian',
    '哈尔滨': 'haerbin', '齐齐哈尔': 'qiqihaer', '牡丹江': 'mudanjiang',
    '佳木斯': 'jiamusi', '大庆': 'daqing', '鸡西': 'jixi', '双鸭山': 'shuangyashan',
    '伊春': 'yichun', '七台河': 'qitaihe', '鹤岗': 'hegang', '绥化': 'suihua',
    '黑河': 'heihe', '大兴安岭': 'daxinganling',
    '南京': 'nanjing', '苏州': 'suzhou', '无锡': 'wuxi', '常州': 'changzhou',
    '镇江': 'zhenjiang', '扬州': 'yangzhou', '泰州': 'taizhou', '南通': 'nantong',
    '盐城': 'yancheng', '淮安': 'huaian', '连云港': 'lianyungang', '徐州': 'xuzhou',
    '宿迁': 'suqian',
    '杭州': 'hangzhou', '宁波': 'ningbo', '温州': 'wenzhou', '绍兴': 'shaoxing',
    '嘉兴': 'jiaxing', '湖州': 'huzhou', '金华': 'jinhua', '台州': 'taizhou',
    '衢州': 'quzhou', '丽水': 'lishui', '舟山': 'zhoushan',
    '合肥': 'hefei', '芜湖': 'wuhu', '蚌埠': 'bengbu', '黄山': 'huangshan',
    '安庆': 'anqing', '马鞍山': 'maanshan', '滁州': 'chuzhou', '阜阳': 'fuyang',
    '宿州': 'suzhou1', '六安': 'liuan', '亳州': 'bozhou', '淮南': 'huainan',
    '淮北': 'huaibei', '铜陵': 'tongling', '池州': 'chizhou', '宣城': 'xuancheng',
    '福州': 'fuzhou', '厦门': 'xiamen', '泉州': 'quanzhou', '漳州': 'zhangzhou',
    '莆田': 'putian', '龙岩': 'longyan', '三明': 'sanming', '南平': 'nanping',
    '宁德': 'ningde',
    '南昌': 'nanchang', '九江': 'jiujiang', '景德镇': 'jingdezhen', '萍乡': 'pingxiang',
    '新余': 'xinyu', '鹰潭': 'yingtan', '赣州': 'ganzhou', '吉安': 'jian',
    '宜春': 'yichun1', '抚州': 'fuzhou1', '上饶': 'shangrao',
    '济南': 'jinan', '青岛': 'qingdao', '烟台': 'yantai', '威海': 'weihai',
    '潍坊': 'weifang', '淄博': 'zibo', '临沂': 'linyi', '济宁': 'jining',
    '泰安': 'taian', '日照': 'rizhao', '德州': 'dezhou', '聊城': 'liaocheng',
    '滨州': 'binzhou', '东营': 'dongying', '枣庄': 'zaozhuang', '菏泽': 'heze',
    '郑州': 'zhengzhou', '洛阳': 'luoyang', '开封': 'kaifeng', '南阳': 'nanyang',
    '安阳': 'anyang', '新乡': 'xinxiang', '许昌': 'xuchang', '平顶山': 'pingdingshan',
    '信阳': 'xinyang', '焦作': 'jiaozuo', '周口': 'zhoukou', '驻马店': 'zhumadian',
    '商丘': 'shangqiu', '三门峡': 'sanmenxia', '漯河': 'luohe', '濮阳': 'puyang',
    '鹤壁': 'hebi', '济源': 'jiyuan',
    '武汉': 'wuhan', '宜昌': 'yichang', '襄阳': 'xiangyang', '荆州': 'jingzhou',
    '十堰': 'shiyan', '黄冈': 'huanggang', '孝感': 'xiaogan', '荆门': 'jingmen',
    '咸宁': 'xianning', '黄石': 'huangshi', '鄂州': 'ezhou', '随州': 'suizhou',
    '恩施': 'enshi',
    '长沙': 'changsha', '株洲': 'zhuzhou', '湘潭': 'xiangtan', '衡阳': 'hengyang',
    '岳阳': 'yueyang', '常德': 'changde', '张家界': 'zhangjiajie', '益阳': 'yiyang',
    '郴州': 'chenzhou', '永州': 'yongzhou', '怀化': 'huaihua', '娄底': 'loudi',
    '湘西': 'xiangxi', '邵阳': 'shaoyang',
    '广州': 'guangzhou', '深圳': 'shenzhen', '珠海': 'zhuhai', '佛山': 'foshan',
    '东莞': 'dongguan', '中山': 'zhongshan', '惠州': 'huizhou', '汕头': 'shantou',
    '江门': 'jiangmen', '湛江': 'zhanjiang', '肇庆': 'zhaoqing', '梅州': 'meizhou',
    '茂名': 'maoming', '韶关': 'shaoguan', '清远': 'qingyuan', '潮州': 'chaozhou',
    '揭阳': 'jieyang', '河源': 'heyuan', '阳江': 'yangjiang', '汕尾': 'shanwei',
    '云浮': 'yunfu',
    '南宁': 'nanning', '桂林': 'guilin', '柳州': 'liuzhou', '北海': 'beihai',
    '梧州': 'wuzhou', '玉林': 'yulin', '百色': 'baise', '河池': 'hechi',
    '钦州': 'qinzhou', '防城港': 'fangchenggang', '贵港': 'guigang', '贺州': 'hezhou',
    '来宾': 'laibin', '崇左': 'chongzuo',
    '海口': 'haikou', '三亚': 'sanya', '儋州': 'danzhou', '琼海': 'qionghai',
    '万宁': 'wanning', '文昌': 'wenchang', '五指山': 'wuzhishan',
    '成都': 'chengdu', '绵阳': 'mianyang', '乐山': 'leshan', '宜宾': 'yibin',
    '泸州': 'luzhou', '南充': 'nanchong', '达州': 'dazhou', '广安': 'guangan',
    '遂宁': 'suining', '内江': 'neijiang', '自贡': 'zigong', '德阳': 'deyang',
    '眉山': 'meishan', '资阳': 'ziyang', '雅安': 'yaan', '广元': 'guangyuan',
    '攀枝花': 'panzhihua', '巴中': 'bazhong', '阿坝': 'aba', '甘孜': 'ganzi',
    '凉山': 'liangshan',
    '贵阳': 'guiyang', '遵义': 'zunyi', '安顺': 'anshun', '六盘水': 'liupanshui',
    '毕节': 'bijie', '铜仁': 'tongren', '黔东南': 'qiandongnan', '黔南': 'qiannan',
    '黔西南': 'qianxinan',
    '昆明': 'kunming', '大理': 'dali', '丽江': 'lijiang', '西双版纳': 'xishuangbanna',
    '曲靖': 'qujing', '玉溪': 'yuxi', '保山': 'baoshan', '昭通': 'zhaotong',
    '普洱': 'puer', '临沧': 'lincang', '楚雄': 'chuxiong', '红河': 'honghe',
    '文山': 'wenshan', '德宏': 'dehong', '迪庆': 'diqing', '怒江': 'nujiang',
    '拉萨': 'lasa', '日喀则': 'rikaze', '林芝': 'linzhi', '山南': 'shannan',
    '昌都': 'changdu', '那曲': 'naqu', '阿里': 'ali',
    '西安': 'xian', '咸阳': 'xianyang', '宝鸡': 'baoji', '渭南': 'weinan',
    '汉中': 'hanzhong', '延安': 'yanan', '榆林': 'yulin1', '安康': 'ankang',
    '商洛': 'shangluo', '铜川': 'tongchuan',
    '兰州': 'lanzhou', '天水': 'tianshui', '酒泉': 'jiuquan', '嘉峪关': 'jiayuguan',
    '张掖': 'zhangye', '武威': 'wuwei', '定西': 'dingxi', '陇南': 'longnan',
    '庆阳': 'qingyang', '平凉': 'pingliang', '白银': 'baiyin', '金昌': 'jinchang',
    '临夏': 'linxia', '甘南': 'gannan',
    '西宁': 'xining', '海东': 'haidong', '海北': 'haibei', '海南': 'hainan1',
    '黄南': 'huangnan', '果洛': 'guoluo', '玉树': 'yushu', '海西': 'haixi',
    '银川': 'yinchuan', '石嘴山': 'shizuishan', '吴忠': 'wuzhong1',
    '固原': 'guyuan', '中卫': 'zhongwei',
    '乌鲁木齐': 'wulumuqi', '吐鲁番': 'tulufan', '喀什': 'kashi', '伊犁': 'yili',
    '阿勒泰': 'aletai', '昌吉': 'changji', '哈密': 'hami', '阿克苏': 'akesu',
    '和田': 'hetian', '克拉玛依': 'kelamayi', '巴音郭楞': 'bayinguoleng',
    '塔城': 'tacheng', '博尔塔拉': 'boertala', '克孜勒苏': 'kezilesu',
    // 港澳台
    '香港': 'xianggang', '澳门': 'aomen', '台北': 'taibei', '台南': 'tainan',
    '台中': 'taizhong', '高雄': 'gaoxiong', '花莲': 'hualian', '阿里山': 'alishan',
  }
  return map[name] || pinyin(name, { toneType: 'none', separator: '' }).toLowerCase().replace(/\s+/g, '')
}

// Generate entries
const entries = []

// City entries
for (const city of CITIES) {
  const pinyin = toPinyin(city.name)
  entries.push({
    name: city.name,
    pinyin,
    lat: city.lat,
    lng: city.lng,
    city: city.name,
    category: 'city',
  })
}

// Attraction/district entries
for (const [cityName, attrs] of Object.entries(ATTRACTIONS)) {
  for (const a of attrs) {
    const pinyin = toPinyin(a.name)
    const entry = {
      name: a.name,
      pinyin,
      lat: a.lat,
      lng: a.lng,
      city: cityName,
      category: a.category,
    }
    if (a.aliases) entry.aliases = a.aliases
    entries.push(entry)
  }
}

// Only keep Chinese aliases (filter out pure-ASCII/English entries)
function isChineseText(s) {
  return /[一-鿿㐀-䶿]/.test(s)
}

// Format output
function formatEntry(e) {
  const parts = [
    `name: '${e.name}'`,
  ]
  const chineseAliases = e.aliases ? e.aliases.filter(isChineseText) : []
  if (chineseAliases.length > 0) parts.push(`aliases: ${JSON.stringify(chineseAliases)}`)
  parts.push(`pinyin: '${e.pinyin}'`)
  parts.push(`lat: ${e.lat}`)
  parts.push(`lng: ${e.lng}`)
  parts.push(`city: '${e.city}'`)
  parts.push(`category: '${e.category}'`)
  return `  { ${parts.join(', ')} },`
}

const lines = [
  `export interface GeoEntry {`,
  `  name: string`,
  `  aliases?: string[]`,
  `  pinyin: string`,
  `  lat: number`,
  `  lng: number`,
  `  city: string`,
  `  category: 'city' | 'attraction' | 'district'`,
  `}`,
  ``,
  `const GEO_DATA: GeoEntry[] = [`,
]

for (const e of entries) {
  lines.push(formatEntry(e))
}

lines.push(`]`)
lines.push(``)
lines.push(`export default GEO_DATA`)
lines.push(``)

const output = lines.join('\n')
writeFileSync('src/data/geo.ts', output)

console.log(`Generated ${entries.length} entries (${CITIES.length} cities, ${entries.length - CITIES.length} attractions/districts)`)
