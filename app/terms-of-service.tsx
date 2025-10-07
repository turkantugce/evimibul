import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from './../contexts/ThemeContext';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kullanım Şartları</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.updateDate, { color: colors.secondaryText }]}>
            Son Güncelleme: 7 Ekim 2025
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Hizmet Koşullarının Kabulü</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Pet Adoption App'i kullanarak, bu Kullanım Şartları'nı kabul etmiş sayılırsınız. 
            Bu şartları kabul etmiyorsanız, lütfen uygulamayı kullanmayınız.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Hizmet Tanımı</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Pet Adoption App, hayvan sahiplendirme sürecini kolaylaştırmak amacıyla 
            kullanıcılar arasında iletişim kurulmasını sağlayan bir platformdur. 
            Uygulamamız:{'\n\n'}
            • Hayvan sahiplendirme ilanlarının yayınlanmasını{'\n'}
            • Kullanıcılar arası mesajlaşmayı{'\n'}
            • Profil yönetimini{'\n'}
            • İlan arama ve filtreleme özelliklerini{'\n'}
            sağlar.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Kullanıcı Sorumlulukları</Text>
          <Text style={[styles.subTitle, { color: colors.text }]}>3.1 Hesap Güvenliği</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            • Hesap bilgilerinizi gizli tutmakla yükümlüsünüz{'\n'}
            • Hesabınızda gerçekleşen tüm faaliyetlerden sorumlusunuz{'\n'}
            • Yetkisiz erişim durumunda bizi derhal bilgilendirmelisiniz
          </Text>

          <Text style={[styles.subTitle, { color: colors.text }]}>3.2 İçerik Sorumluluğu</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Yayınladığınız tüm içeriklerden siz sorumlusunuz. İçerikleriniz:{'\n\n'}
            • Gerçek ve doğru olmalıdır{'\n'}
            • Yasalara uygun olmalıdır{'\n'}
            • Başkalarının haklarını ihlal etmemelidir{'\n'}
            • Yanıltıcı veya aldatıcı olmamalıdır
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Yasak Davranışlar</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Aşağıdaki davranışlar kesinlikle yasaktır:{'\n\n'}
            • Hayvan satışı veya ticari amaçlı kullanım{'\n'}
            • Sahte veya yanıltıcı bilgi paylaşımı{'\n'}
            • Taciz, hakaret veya tehdit içeren içerikler{'\n'}
            • Telif hakkı ihlali{'\n'}
            • Spam veya istenmeyen içerik gönderimi{'\n'}
            • Başkalarının hesaplarına yetkisiz erişim{'\n'}
            • Sistemi manipüle etme veya zarar verme girişimleri
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Hayvan Sahiplendirme Politikası</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            • Bu platform yalnızca sahiplendirme amaçlıdır{'\n'}
            • Hayvan satışı kesinlikle yasaktır{'\n'}
            • Sahiplendirme öncesi gerekli kontrollerin yapılması tavsiye edilir{'\n'}
            • Platform, sahiplendirme sonrası durumlardan sorumlu değildir{'\n'}
            • Kullanıcılar, yerel yasalara uymakla yükümlüdür
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Fikri Mülkiyet Hakları</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            • Uygulama ve içeriği Pet Adoption App'e aittir{'\n'}
            • Kullanıcıların yüklediği içeriklerin hakları kullanıcılara aittir{'\n'}
            • İçerik yükleyerek, platforma sınırlı bir kullanım lisansı vermiş olursunuz{'\n'}
            • Başkalarının içeriklerini izinsiz kullanmayınız
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Hizmet Değişiklikleri ve Sonlandırma</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            • Hizmetimizi önceden bildirimde bulunmaksızın değiştirebilir veya 
            sonlandırabiliriz{'\n'}
            • Kullanım şartlarını ihlal eden hesapları askıya alabilir veya kapatabilir{'\n'}
            • Hesap kapatma durumunda, verileriniz gizlilik politikamıza uygun şekilde işlenir
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Sorumluluk Reddi</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            • Hizmet "olduğu gibi" sunulmaktadır{'\n'}
            • Kullanıcılar arası iletişim ve anlaşmalardan sorumlu değiliz{'\n'}
            • İlan içeriklerinin doğruluğunu garanti etmeyiz{'\n'}
            • Hizmet kesintilerinden dolayı sorumluluk kabul etmeyiz{'\n'}
            • Üçüncü taraf hizmetlerinden sorumlu değiliz
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Sorumluluk Sınırlaması</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Pet Adoption App, yasaların izin verdiği ölçüde, dolaylı, arızi veya özel 
            zararlardan sorumlu tutulamaz. Bu sınırlama şunları içerir ancak bunlarla 
            sınırlı değildir:{'\n\n'}
            • Veri kaybı{'\n'}
            • Gelir kaybı{'\n'}
            • İş kesintisi{'\n'}
            • Kişisel yaralanma (hayvan etkileşiminden kaynaklanan)
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>10. Uyuşmazlık Çözümü</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Bu şartlardan kaynaklanan uyuşmazlıklar, öncelikle dostane görüşmelerle 
            çözülmeye çalışılacaktır. Çözülemezse, Türkiye Cumhuriyeti yasaları 
            uygulanacaktır.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>11. Değişiklikler</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Bu Kullanım Şartları'nı dilediğimiz zaman güncelleyebiliriz. Önemli 
            değişiklikler için size bildirimde bulunacağız. Değişikliklerden sonra 
            uygulamayı kullanmaya devam ederseniz, yeni şartları kabul etmiş sayılırsınız.
          </Text>

          <View style={[styles.footer, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="document-text" size={32} color={colors.primary} />
            <Text style={[styles.footerText, { color: colors.text }]}>
              Adil ve Güvenli Kullanım
            </Text>
            <Text style={[styles.footerSubtext, { color: colors.secondaryText }]}>
              Bu şartlar, tüm kullanıcıların güvenliğini sağlamak içindir
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  updateDate: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  footer: {
    marginTop: 40,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});