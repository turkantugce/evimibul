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

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gizlilik Politikası</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.updateDate, { color: colors.secondaryText }]}>
            Son Güncelleme: 7 Ekim 2025
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Giriş</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Pet Adoption App olarak, kullanıcılarımızın gizliliğini korumayı taahhüt ediyoruz. 
            Bu Gizlilik Politikası, uygulamamızı kullanırken kişisel bilgilerinizin nasıl 
            toplandığını, kullanıldığını ve korunduğunu açıklar.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Topladığımız Bilgiler</Text>
          <Text style={[styles.subTitle, { color: colors.text }]}>2.1 Hesap Bilgileri</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            • Ad ve soyad{'\n'}
            • E-posta adresi{'\n'}
            • Telefon numarası (opsiyonel){'\n'}
            • Profil fotoğrafı (opsiyonel){'\n'}
            • Konum bilgisi (opsiyonel)
          </Text>

          <Text style={[styles.subTitle, { color: colors.text }]}>2.2 İlan Bilgileri</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            • Sahiplendirilecek hayvan fotoğrafları{'\n'}
            • Hayvan özellikleri ve açıklamaları{'\n'}
            • İlan tarihi ve durumu
          </Text>

          <Text style={[styles.subTitle, { color: colors.text }]}>2.3 İletişim Verileri</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            • Uygulama içi mesajlaşma geçmişi{'\n'}
            • İletişim tercihleri
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Bilgilerin Kullanımı</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Topladığımız bilgileri aşağıdaki amaçlarla kullanırız:{'\n\n'}
            • Hesabınızı oluşturmak ve yönetmek{'\n'}
            • İlan yayınlama ve sahiplendirme süreçlerini kolaylaştırmak{'\n'}
            • Kullanıcılar arasında iletişimi sağlamak{'\n'}
            • Uygulama güvenliğini sağlamak{'\n'}
            • Size önemli bildirimler göndermek{'\n'}
            • Hizmetlerimizi geliştirmek
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Bilgi Paylaşımı</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Kişisel bilgilerinizi üçüncü taraflarla paylaşmayız, satmayız veya kiralamayız. 
            Bilgileriniz yalnızca aşağıdaki durumlarda paylaşılabilir:{'\n\n'}
            • Yasal zorunluluklar{'\n'}
            • Güvenlik ve dolandırıcılık önleme{'\n'}
            • Sizin açık izninizle
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Veri Güvenliği</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Bilgilerinizi korumak için endüstri standardı güvenlik önlemleri kullanıyoruz:{'\n\n'}
            • Şifreli veri aktarımı (SSL/TLS){'\n'}
            • Güvenli veri saklama (Firebase){'\n'}
            • Düzenli güvenlik denetimleri{'\n'}
            • Erişim kontrolü ve yetkilendirme
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Haklarınız</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Kişisel verilerinizle ilgili haklarınız:{'\n\n'}
            • Bilgilerinize erişme hakkı{'\n'}
            • Bilgilerinizi düzeltme hakkı{'\n'}
            • Bilgilerinizi silme hakkı{'\n'}
            • Veri taşınabilirliği hakkı{'\n'}
            • İtiraz etme hakkı
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Çerezler ve İzleme</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Uygulamamız, kullanıcı deneyimini iyileştirmek için bazı cihaz bilgilerini 
            ve kullanım verilerini toplar. Bu veriler anonim olarak toplanır ve kişisel 
            kimliğinizi belirlemek için kullanılmaz.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Çocukların Gizliliği</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Uygulamamız 13 yaşın altındaki çocuklara yönelik değildir. Bilinçli olarak 
            13 yaşın altındaki çocuklardan kişisel bilgi toplamıyoruz.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Değişiklikler</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Bu Gizlilik Politikası'nı zaman zaman güncelleyebiliriz. Önemli değişiklikler 
            olduğunda sizi uygulama içi bildirimlerle haberdar edeceğiz.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>10. İletişim</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Gizlilik politikamızla ilgili sorularınız için:{'\n\n'}
            E-posta: privacy@petadoption.com{'\n'}
            Destek: destek@petadoption.com
          </Text>

          <View style={[styles.footer, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
            <Text style={[styles.footerText, { color: colors.text }]}>
              Verileriniz Güvende
            </Text>
            <Text style={[styles.footerSubtext, { color: colors.secondaryText }]}>
              Gizliliğinizi korumak bizim önceliğimizdir
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