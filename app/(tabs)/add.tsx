import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext'; // Tema eklendi
import { db, storage } from '../../firebase';

const SPECIES_OPTIONS = ['Kedi', 'Köpek', 'Kuş', 'Tavşan', 'Hamster', 'Balık', 'Diğer'];
const GENDER_OPTIONS = ['Erkek', 'Dişi', 'Bilinmiyor'];
const AGE_OPTIONS = ['0-6 ay', '6-12 ay', '1-3 yaş', '3-7 yaş', '7+ yaş'];

const CITIES_AND_DISTRICTS = {
  Adana: ["Aladağ", "Ceyhan", "Çukurova", "Feke", "İmamoğlu", "Karaisalı", "Karataş", "Kozan", "Pozantı", "Saimbeyli", "Sarıçam", "Seyhan", "Tufanbeyli", "Yumurtalık", "Yüreğir"],
  Adıyaman: ["Merkez", "Besni", "Çelikhan", "Gerger", "Gölbaşı", "Kahta", "Samsat", "Sincik", "Tut"],
  Afyon: ["Merkez", "Başmakçı", "Bayat", "Çay", "Bolvadin", "Çobanlar", "Dazkırı", "Dinar", "Emirdağ", "Evciler", "Hocalar", "İhsaniye", "İscehisar", "Kızılören", "Sandıklı", "Sinanpaşa", "Şuhut", "Sultandağı"],
  Ağrı: ["Merkez", "Doğubeyazıt", "Diyadin", "Taşlıçay", "Eleşkirt", "Hamur", "Patnos", "Tutak"],
  Aksaray: [ "Ağaçören", "Eskil", "Gülağaç", "Güzelyurt", "Merkez", "Ortaköy", "Sarıyahşi" ],
  Amasya: [ "Göynücek", "Gümüşhacıköy", "Hamamözü", "Merkez", "Merzifon", "Suluova", "Taşova" ],
  Ankara: [ "Altındağ", "Ayaş", "Bala", "Beypazarı", "Çamlıdere", "Çankaya", "Çubuk", "Elmadağ", "Güdül", "Haymana", "Kalecik", "Kızılcahamam", "Nallıhan", "Polatlı", "Şereflikoçhisar", "Yenimahalle", "Gölbaşı", "Keçiören", "Mamak", "Sincan", "Kazan", "Akyurt", "Etimesgut", "Evren", "Pursaklar" ],
  Antalya: [ "Akseki", "Alanya", "Elmalı", "Finike", "Gazipaşa", "Gündoğmuş", "Kaş", "Korkuteli", "Kumluca", "Manavgat", "Serik", "Demre", "İbradı", "Kemer", "Aksu", "Döşemealtı", "Kepez", "Konyaaltı", "Muratpaşa" ],
  Ardahan: [ "Merkez", "Çıldır", "Göle", "Hanak", "Posof", "Damal" ],
  Artvin: [ "Ardanuç", "Arhavi", "Merkez", "Borçka", "Hopa", "Şavşat", "Yusufeli", "Murgul" ] ,
  Aydın: [ "Merkez", "Bozdoğan", "Efeler", "Çine", "Germencik", "Karacasu", "Koçarlı", "Kuşadası", "Kuyucak", "Nazilli", "Söke", "Sultanhisar", "Yenipazar", "Buharkent", "İncirliova", "Karpuzlu", "Köşk", "Didim" ],
  Balıkesir: [ "Altıeylül", "Ayvalık", "Merkez", "Balya", "Bandırma", "Bigadiç", "Burhaniye", "Dursunbey", "Edremit", "Erdek", "Gönen", "Havran", "İvrindi", "Karesi", "Kepsut", "Manyas", "Savaştepe", "Sındırgı", "Gömeç", "Susurluk", "Marmara" ],
  Bartın: [ "Merkez", "Kurucaşile", "Ulus", "Amasra" ],
  Batman: [ "Merkez", "Beşiri", "Gercüş", "Kozluk", "Sason", "Hasankeyf" ] ,
  Bayburt: [ "Merkez", "Aydıntepe", "Demirözü" ] ,
  Bilecik: [ "Merkez", "Bozüyük", "Gölpazarı", "Osmaneli", "Pazaryeri", "Söğüt", "Yenipazar", "İnhisar" ],
  Bingöl: [ "Merkez", "Genç", "Karlıova", "Kiğı", "Solhan", "Adaklı", "Yayladere", "Yedisu" ],
  Bitlis: [ "Adilcevaz", "Ahlat", "Merkez", "Hizan", "Mutki", "Tatvan", "Güroymak" ],
  Bolu: [ "Merkez", "Gerede", "Göynük", "Kıbrıscık", "Mengen", "Mudurnu", "Seben", "Dörtdivan", "Yeniçağa" ],
  Burdur: [ "Ağlasun", "Bucak", "Merkez", "Gölhisar", "Tefenni", "Yeşilova", "Karamanlı", "Kemer", "Altınyayla", "Çavdır", "Çeltikçi" ],
  Bursa: [ "Gemlik", "İnegöl", "İznik", "Karacabey", "Keles", "Mudanya", "Mustafakemalpaşa", "Orhaneli", "Orhangazi", "Yenişehir", "Büyükorhan", "Harmancık", "Nilüfer", "Osmangazi", "Yıldırım", "Gürsu", "Kestel" ],
  Çanakkale: [ "Ayvacık", "Bayramiç", "Biga", "Bozcaada", "Çan", "Merkez", "Eceabat", "Ezine", "Gelibolu", "Gökçeada", "Lapseki", "Yenice" ] ,
  Çankırı: [ "Merkez", "Çerkeş", "Eldivan", "Ilgaz", "Kurşunlu", "Orta", "Şabanözü", "Yapraklı", "Atkaracalar", "Kızılırmak", "Bayramören", "Korgun" ],
  Çorum:  [ "Alaca", "Bayat", "Merkez", "İskilip", "Kargı", "Mecitözü", "Ortaköy", "Osmancık", "Sungurlu", "Boğazkale", "Uğurludağ", "Dodurga", "Laçin", "Oğuzlar" ] ,
  Denizli: [ "Acıpayam", "Buldan", "Çal", "Çameli", "Çardak", "Çivril", "Merkez", "Merkezefendi", "Pamukkale", "Güney", "Kale", "Sarayköy", "Tavas", "Babadağ", "Bekilli", "Honaz", "Serinhisar", "Baklan", "Beyağaç", "Bozkurt" ],
  Diyarbakır: [ "Kocaköy", "Çermik", "Çınar", "Çüngüş", "Dicle", "Ergani", "Hani", "Hazro", "Kulp", "Lice", "Silvan", "Eğil", "Bağlar", "Kayapınar", "Sur", "Yenişehir", "Bismil" ],
  Düzce: [ "Akçakoca", "Merkez", "Yığılca", "Cumayeri", "Gölyaka", "Çilimli", "Gümüşova", "Kaynaşlı" ],
  Edirne: [ "Merkez", "Enez", "Havsa", "İpsala", "Keşan", "Lalapaşa", "Meriç", "Uzunköprü", "Süloğlu" ] ,
  Elazığ: [ "Ağın", "Baskil", "Merkez", "Karakoçan", "Keban", "Maden", "Palu", "Sivrice", "Arıcak", "Kovancılar", "Alacakaya" ],
  Erzincan: [ "Çayırlı", "Merkez", "İliç", "Kemah", "Kemaliye", "Refahiye", "Tercan", "Üzümlü", "Otlukbeli" ] ,
  Erzurum: [ "Aşkale", "Çat", "Hınıs", "Horasan", "İspir", "Karayazı", "Narman", "Oltu", "Olur", "Pasinler", "Şenkaya", "Tekman", "Tortum", "Karaçoban", "Uzundere", "Pazaryolu", "Köprüköy", "Palandöken", "Yakutiye", "Aziziye" ] ,
  Eskişehir: [ "Çifteler", "Mahmudiye", "Mihalıççık", "Sarıcakaya", "Seyitgazi", "Sivrihisar", "Alpu", "Beylikova", "İnönü", "Günyüzü", "Han", "Mihalgazi", "Odunpazarı", "Tepebaşı" ],
  Gaziantep:  [ "Araban", "İslahiye", "Nizip", "Oğuzeli", "Yavuzeli", "Şahinbey", "Şehitkamil", "Karkamış", "Nurdağı" ],
  Giresun:  [ "Alucra", "Bulancak", "Dereli", "Espiye", "Eynesil", "Merkez", "Görele", "Keşap", "Şebinkarahisar", "Tirebolu", "Piraziz", "Yağlıdere", "Çamoluk", "Çanakçı", "Doğankent", "Güce" ] ,
  Gümüşhane: [ "Merkez", "Kelkit", "Şiran", "Torul", "Köse", "Kürtün" ] ,
  Hakkari: [ "Çukurca", "Merkez", "Şemdinli", "Yüksekova" ] ,
  Hatay: [ "Altınözü", "Arsuz", "Defne", "Dörtyol", "Hassa", "Antakya", "İskenderun", "Kırıkhan", "Payas", "Reyhanlı", "Samandağ", "Yayladağı", "Erzin", "Belen", "Kumlu" ],
  Iğdır: [ "Aralık", "Merkez", "Tuzluca", "Karakoyunlu" ],
  Isparta: [ "Atabey", "Eğirdir", "Gelendost", "Merkez", "Keçiborlu", "Senirkent", "Sütçüler", "Şarkikaraağaç", "Uluborlu", "Yalvaç", "Aksu", "Gönen", "Yenişarbademli" ],
  İstanbul: [ "Adalar", "Bakırköy", "Beşiktaş", "Beykoz", "Beyoğlu", "Çatalca", "Eyüp", "Fatih", "Gaziosmanpaşa", "Kadıköy", "Kartal", "Sarıyer", "Silivri", "Şile", "Şişli", "Üsküdar", "Zeytinburnu", "Büyükçekmece", "Kağıthane", "Küçükçekmece", "Pendik", "Ümraniye", "Bayrampaşa", "Avcılar", "Bağcılar", "Bahçelievler", "Güngören", "Maltepe", "Sultanbeyli", "Tuzla", "Esenler", "Arnavutköy", "Ataşehir", "Başakşehir", "Beylikdüzü", "Çekmeköy", "Esenyurt", "Sancaktepe", "Sultangazi" ],
  İzmir: [ "Aliağa", "Bayındır", "Bergama", "Bornova", "Çeşme", "Dikili", "Foça", "Karaburun", "Karşıyaka", "Kemalpaşa", "Kınık", "Kiraz", "Menemen", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Torbalı", "Urla", "Beydağ", "Buca", "Konak", "Menderes", "Balçova", "Çiğli", "Gaziemir", "Narlıdere", "Güzelbahçe", "Bayraklı", "Karabağlar" ],
  Kahramanmaraş: [ "Afşin", "Andırın", "Dulkadiroğlu", "Onikişubat", "Elbistan", "Göksun", "Merkez", "Pazarcık", "Türkoğlu", "Çağlayancerit", "Ekinözü", "Nurhak" ],
  Karabük: [ "Eflani", "Eskipazar", "Merkez", "Ovacık", "Safranbolu", "Yenice" ] ,
  Karaman: [ "Ermenek", "Merkez", "Ayrancı", "Kazımkarabekir", "Başyayla", "Sarıveliler" ],
  Kars: [ "Arpaçay", "Digor", "Kağızman", "Merkez", "Sarıkamış", "Selim", "Susuz", "Akyaka" ],
  Kastamonu: [ "Abana", "Araç", "Azdavay", "Bozkurt", "Cide", "Çatalzeytin", "Daday", "Devrekani", "İnebolu", "Merkez", "Küre", "Taşköprü", "Tosya", "İhsangazi", "Pınarbaşı", "Şenpazar", "Ağlı", "Doğanyurt", "Hanönü", "Seydiler" ],
  Kayseri: [ "Bünyan", "Develi", "Felahiye", "İncesu", "Pınarbaşı", "Sarıoğlan", "Sarız", "Tomarza", "Yahyalı", "Yeşilhisar", "Akkışla", "Talas", "Kocasinan", "Melikgazi", "Hacılar", "Özvatan" ],
  Kırıkkale: [ "Delice", "Keskin", "Merkez", "Sulakyurt", "Bahşili", "Balışeyh", "Çelebi", "Karakeçili", "Yahşihan" ],
  Kırklareli: [ "Babaeski", "Demirköy", "Merkez", "Kofçaz", "Lüleburgaz", "Pehlivanköy", "Pınarhisar", "Vize" ],
  Kırşehir: [ "Çiçekdağı", "Kaman", "Merkez", "Mucur", "Akpınar", "Akçakent", "Boztepe" ],
  Kilis: [ "Merkez", "Elbeyli", "Musabeyli", "Polateli" ],
  Kocaeli: [ "Gebze", "Gölcük", "Kandıra", "Karamürsel", "Körfez", "Derince", "Başiskele", "Çayırova", "Darıca", "Dilovası", "İzmit", "Kartepe" ] ,
  Konya: [ "Akşehir", "Beyşehir", "Bozkır", "Cihanbeyli", "Çumra", "Doğanhisar", "Ereğli", "Hadim", "Ilgın", "Kadınhanı", "Karapınar", "Kulu", "Sarayönü", "Seydişehir", "Yunak", "Akören", "Altınekin", "Derebucak", "Hüyük", "Karatay", "Meram", "Selçuklu", "Taşkent", "Ahırlı", "Çeltik", "Derbent", "Emirgazi", "Güneysınır", "Halkapınar", "Tuzlukçu", "Yalıhüyük" ] ,
  Kütahya: [ "Altıntaş", "Domaniç", "Emet", "Gediz", "Merkez", "Simav", "Tavşanlı", "Aslanapa", "Dumlupınar", "Hisarcık", "Şaphane", "Çavdarhisar", "Pazarlar" ],
  Malatya: [ "Akçadağ", "Arapgir", "Arguvan", "Darende", "Doğanşehir", "Hekimhan", "Merkez", "Pütürge", "Yeşilyurt", "Battalgazi", "Doğanyol", "Kale", "Kuluncak", "Yazıhan" ] ,
  Manisa: [ "Akhisar", "Alaşehir", "Demirci", "Gördes", "Kırkağaç", "Kula", "Merkez", "Salihli", "Sarıgöl", "Saruhanlı", "Selendi", "Soma", "Şehzadeler", "Yunusemre", "Turgutlu", "Ahmetli", "Gölmarmara", "Köprübaşı" ],
  Mardin: [ "Derik", "Kızıltepe", "Artuklu", "Merkez", "Mazıdağı", "Midyat", "Nusaybin", "Ömerli", "Savur", "Dargeçit", "Yeşilli" ],
  Mersin: [ "Anamur", "Erdemli", "Gülnar", "Mut", "Silifke", "Tarsus", "Aydıncık", "Bozyazı", "Çamlıyayla", "Akdeniz", "Mezitli", "Toroslar", "Yenişehir" ] ,
  Muğla: [ "Bodrum", "Datça", "Fethiye", "Köyceğiz", "Marmaris", "Menteşe", "Milas", "Ula", "Yatağan", "Dalaman", "Seydikemer", "Ortaca", "Kavaklıdere" ],
  Muş: [ "Bulanık", "Malazgirt", "Merkez", "Varto", "Hasköy", "Korkut" ],
  Nevşehir: [ "Avanos", "Derinkuyu", "Gülşehir", "Hacıbektaş", "Kozaklı", "Merkez", "Ürgüp", "Acıgöl" ],
  Niğde:  [ "Bor", "Çamardı", "Merkez", "Ulukışla", "Altunhisar", "Çiftlik" ],
  Ordu:  [ "Akkuş", "Altınordu", "Aybastı", "Fatsa", "Gölköy", "Korgan", "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye", "Gülyalı", "Gürgentepe", "Çamaş", "Çatalpınar", "Çaybaşı", "İkizce", "Kabadüz", "Kabataş" ],
  Osmaniye: [ "Bahçe", "Kadirli", "Merkez", "Düziçi", "Hasanbeyli", "Sumbas", "Toprakkale" ],
  Rize: [ "Ardeşen", "Çamlıhemşin", "Çayeli", "Fındıklı", "İkizdere", "Kalkandere", "Pazar", "Merkez", "Güneysu", "Derepazarı", "Hemşin", "İyidere" ],
  Sakarya: [ "Akyazı", "Geyve", "Hendek", "Karasu", "Kaynarca", "Sapanca", "Kocaali", "Pamukova", "Taraklı", "Ferizli", "Karapürçek", "Söğütlü", "Adapazarı", "Arifiye", "Erenler", "Serdivan" ] ,
  Samsun: [ "Alaçam", "Bafra", "Çarşamba", "Havza", "Kavak", "Ladik", "Terme", "Vezirköprü", "Asarcık", "Ondokuzmayıs", "Salıpazarı", "Tekkeköy", "Ayvacık", "Yakakent", "Atakum", "Canik", "İlkadım" ] ,
  Siirt: [ "Baykan", "Eruh", "Kurtalan", "Pervari", "Merkez", "Şirvan", "Tillo" ],
  Sinop: [ "Ayancık", "Boyabat", "Durağan", "Erfelek", "Gerze", "Merkez", "Türkeli", "Dikmen", "Saraydüzü" ],
  Sivas: [ "Divriği", "Gemerek", "Gürün", "Hafik", "İmranlı", "Kangal", "Koyulhisar", "Merkez", "Suşehri", "Şarkışla", "Yıldızeli", "Zara", "Akıncılar", "Altınyayla", "Doğanşar", "Gölova", "Ulaş" ] ,
  Şanlıurfa: [ "Akçakale", "Birecik", "Bozova", "Ceylanpınar", "Eyyübiye", "Halfeti", "Haliliye", "Hilvan", "Karaköprü", "Siverek", "Suruç", "Viranşehir", "Harran" ],
  Şırnak: [ "Beytüşşebap", "Cizre", "İdil", "Silopi", "Merkez", "Uludere", "Güçlükonak" ] ,
  Tekirdağ: [ "Çerkezköy", "Çorlu", "Ergene", "Hayrabolu", "Malkara", "Muratlı", "Saray", "Süleymanpaşa", "Kapaklı", "Şarköy", "Marmaraereğlisi" ],
  Tokat: [ "Almus", "Artova", "Erbaa", "Niksar", "Reşadiye", "Merkez", "Turhal", "Zile", "Pazar", "Yeşilyurt", "Başçiftlik", "Sulusaray" ],
  Trabzon: [ "Akçaabat", "Araklı", "Arsin", "Çaykara", "Maçka", "Of", "Ortahisar", "Sürmene", "Tonya", "Vakfıkebir", "Yomra", "Beşikdüzü", "Şalpazarı", "Çarşıbaşı", "Dernekpazarı", "Düzköy", "Hayrat", "Köprübaşı" ],
  Tunceli: [ "Çemişgezek", "Hozat", "Mazgirt", "Nazımiye", "Ovacık", "Pertek", "Pülümür", "Merkez" ] ,
  Uşak: [ "Banaz", "Eşme", "Karahallı", "Sivaslı", "Ulubey", "Merkez" ],
  Van: [ "Başkale", "Çatak", "Erciş", "Gevaş", "Gürpınar", "İpekyolu", "Muradiye", "Özalp", "Tuşba", "Bahçesaray", "Çaldıran", "Edremit", "Saray" ] ,
  Yalova: [ "Merkez", "Altınova", "Armutlu", "Çınarcık", "Çiftlikköy", "Termal" ],
  Yozgat: [ "Akdağmadeni", "Boğazlıyan", "Çayıralan", "Çekerek", "Sarıkaya", "Sorgun", "Şefaatli", "Yerköy", "Merkez", "Aydıncık", "Çandır", "Kadışehri", "Saraykent", "Yenifakılı" ],
  Zonguldak:  [ "Çaycuma", "Devrek", "Ereğli", "Merkez", "Alaplı", "Gökçebey" ]
};

const DropdownModal = ({ 
  visible, 
  title,
  data, 
  onSelect, 
  onClose 
}: { 
  visible: boolean;
  title: string;
  data: string[]; 
  onSelect: (item: string) => void; 
  onClose: () => void;
}) => {
  const { colors } = useTheme(); // Tema eklendi

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScroll}>
            {data.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => onSelect(item)}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function AddListingScreen() {
  const [form, setForm] = useState({
    title: '',
    species: '',
    breed: '',
    age: '',
    gender: '',
    city: '',
    district: '',
    description: '',
    vaccinated: false,
    neutered: false
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);

  const { user } = useAuthContext();
  const router = useRouter();
  const { colors } = useTheme(); // Tema eklendi

  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit', 'En fazla 5 fotoğraf ekleyebilirsiniz');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişimi gerekiyor');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const filename = `listings/${user?.uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Hata', 'Önce giriş yapmalısınız');
      return;
    }

    // Validasyon
    if (!form.title.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilan başlığı girin');
      return;
    }
    if (!form.species) {
      Alert.alert('Eksik Bilgi', 'Lütfen hayvan türünü seçin');
      return;
    }
    if (!form.age) {
      Alert.alert('Eksik Bilgi', 'Lütfen yaş aralığını seçin');
      return;
    }
    if (!form.city.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen şehir bilgisi girin');
      return;
    }
    if (!form.description.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen açıklama ekleyin');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen en az bir fotoğraf ekleyin');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Fotoğrafları yükle
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadImage(photos[i]);
        photoUrls.push(url);
        setUploadProgress(((i + 1) / photos.length) * 100);
      }

      // Firestore'a kaydet
      await addDoc(collection(db, 'listings'), {
        ...form,
        title: form.title.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        description: form.description.trim(),
        photos: photoUrls,
        ownerId: user.uid,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      Alert.alert('Başarılı', 'İlanınız başarıyla yayınlandı!', [
        { text: 'Tamam', onPress: () => router.push('/(tabs)') }
      ]);
      
      // Formu temizle
      setForm({
        title: '',
        species: '',
        breed: '',
        age: '',
        gender: '',
        city: '',
        district: '',
        description: '',
        vaccinated: false,
        neutered: false
      });
      setPhotos([]);

    } catch (error) {
      console.error('İlan ekleme hatası:', error);
      Alert.alert('Hata', 'İlan eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleCitySelect = (city: string) => {
    setForm({ ...form, city, district: '' });
    setShowCityModal(false);
  };

  const handleDistrictSelect = (district: string) => {
    setForm({ ...form, district });
    setShowDistrictModal(false);
  };

  const SelectButton = ({ 
    label, 
    selected, 
    onPress 
  }: { 
    label: string; 
    selected: boolean; 
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.selectButton, 
        { backgroundColor: colors.inputBackground, borderColor: colors.border },
        selected && [styles.selectButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.selectButtonText, 
        { color: colors.secondaryText },
        selected && [styles.selectButtonTextActive, { color: colors.card }]
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>İlan Ekle</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            
          </Text>
        </View>

        {/* Fotoğraflar */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Fotoğraflar</Text>
            <Text style={[styles.required, { color: colors.danger }]}>*</Text>
          </View>
          <Text style={[styles.helperText, { color: colors.secondaryText }]}>
            En fazla 5 fotoğraf ekleyebilirsiniz ({photos.length}/5)
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.photoScroll}
          >
            <TouchableOpacity 
              style={[
                styles.addPhotoButton, 
                { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground
                }
              ]} 
              onPress={pickImage}
              disabled={photos.length >= 5}
            >
              <Ionicons name="camera" size={32} color={colors.secondaryText} />
              <Text style={[styles.addPhotoText, { color: colors.secondaryText }]}>Fotoğraf Ekle</Text>
            </TouchableOpacity>

            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Temel Bilgiler */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="paw" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Temel Bilgiler</Text>
            <Text style={[styles.required, { color: colors.danger }]}>*</Text>
          </View>

          {/* İlan Başlığı */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>İlan Başlığı</Text>
            <TextInput
              style={[
                styles.input, 
                { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                  color: colors.text
                }
              ]}
              placeholder="Örn: Yavru kedi, sokak kedisi vb."
              placeholderTextColor={colors.secondaryText}
              value={form.title}
              onChangeText={(text) => setForm({ ...form, title: text })}
            />
          </View>

          {/* Tür Seçimi */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Tür</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScroll}
            >
              {SPECIES_OPTIONS.map((species) => (
                <SelectButton
                  key={species}
                  label={species}
                  selected={form.species === species}
                  onPress={() => setForm({ ...form, species })}
                />
              ))}
            </ScrollView>
          </View>

          {/* Cins */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Cins (Opsiyonel)</Text>
            <TextInput
              style={[
                styles.input, 
                { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                  color: colors.text
                }
              ]}
              placeholder="Örn: Tekir, Golden Retriever, Japon Balığı vb."
              placeholderTextColor={colors.secondaryText}
              value={form.breed}
              onChangeText={(text) => setForm({ ...form, breed: text })}
            />
          </View>

          {/* Yaş */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Yaş</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScroll}
            >
              {AGE_OPTIONS.map((age) => (
                <SelectButton
                  key={age}
                  label={age}
                  selected={form.age === age}
                  onPress={() => setForm({ ...form, age })}
                />
              ))}
            </ScrollView>
          </View>

          {/* Cinsiyet */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Cinsiyet (Opsiyonel)</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScroll}
            >
              {GENDER_OPTIONS.map((gender) => (
                <SelectButton
                  key={gender}
                  label={gender}
                  selected={form.gender === gender}
                  onPress={() => setForm({ ...form, gender })}
                />
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Konum */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Konum</Text>
            <Text style={[styles.required, { color: colors.danger }]}>*</Text>
          </View>

          {/* Şehir Seçimi */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Şehir</Text>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger, 
                { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground
                }
              ]}
              onPress={() => setShowCityModal(true)}
            >
              <Text style={form.city ? 
                [styles.dropdownTriggerText, { color: colors.text }] : 
                [styles.dropdownTriggerPlaceholder, { color: colors.secondaryText }]
              }>
                {form.city || 'Şehir seçin'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* İlçe Seçimi */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>İlçe</Text>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger, 
                { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground
                },
                !form.city && styles.disabled
              ]}
              onPress={() => form.city && setShowDistrictModal(true)}
              disabled={!form.city}
            >
              <Text style={form.district ? 
                [styles.dropdownTriggerText, { color: colors.text }] : 
                [styles.dropdownTriggerPlaceholder, { color: colors.secondaryText }]
              }>
                {form.district || (form.city ? 'İlçe seçin' : 'Önce şehir seçin')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={form.city ? colors.secondaryText : colors.border} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sağlık Bilgileri */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sağlık Bilgileri</Text>
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setForm({ ...form, vaccinated: !form.vaccinated })}
            >
              <View style={[
                styles.checkbox, 
                { borderColor: colors.border },
                form.vaccinated && [styles.checkboxChecked, { backgroundColor: colors.primary, borderColor: colors.primary }]
              ]}>
                {form.vaccinated && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>Aşıları tamamlandı</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setForm({ ...form, neutered: !form.neutered })}
            >
              <View style={[
                styles.checkbox, 
                { borderColor: colors.border },
                form.neutered && [styles.checkboxChecked, { backgroundColor: colors.primary, borderColor: colors.primary }]
              ]}>
                {form.neutered && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>Kısırlaştırıldı</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Açıklama */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Açıklama</Text>
            <Text style={[styles.required, { color: colors.danger }]}>*</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Detaylı Açıklama</Text>
            <TextInput
              style={[
                styles.input, 
                styles.textArea,
                { 
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                  color: colors.text
                }
              ]}
              placeholder="Kişiliği, alışkanlıkları, özel ihtiyaçları hakkında bilgi verin..."
              placeholderTextColor={colors.secondaryText}
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.helperText, { color: colors.secondaryText }]}>
              {form.description.length}/500 karakter
            </Text>
          </View>
        </View>

        {/* Yükleme İndikatörü */}
        {uploading && (
          <View style={[styles.uploadContainer, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.uploadText, { color: colors.text }]}>
              Fotoğraflar yükleniyor... %{Math.round(uploadProgress)}
            </Text>
          </View>
        )}

        {/* Gönder Butonu */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (uploading || !user) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={uploading || !user}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="paw" size={20} color="white" />
              <Text style={styles.submitButtonText}>İlanı Yayınla</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Dropdown Modallar */}
      <DropdownModal
        visible={showCityModal}
        title="Şehir Seçin"
        data={Object.keys(CITIES_AND_DISTRICTS)}
        onSelect={handleCitySelect}
        onClose={() => setShowCityModal(false)}
      />

      <DropdownModal
        visible={showDistrictModal}
        title="İlçe Seçin"
        data={form.city ? CITIES_AND_DISTRICTS[form.city as keyof typeof CITIES_AND_DISTRICTS] || [] : []}
        onSelect={handleDistrictSelect}
        onClose={() => setShowDistrictModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    marginTop: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  required: {
    fontSize: 16,
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  helperText: {
    fontSize: 14,
    marginTop: 4,
  },
  photoScroll: {
    flexDirection: 'row',
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addPhotoText: {
    marginTop: 8,
    fontSize: 14,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  optionsScroll: {
    flexDirection: 'row',
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  selectButtonActive: {},
  selectButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectButtonTextActive: {},
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  dropdownTriggerText: {
    fontSize: 16,
  },
  dropdownTriggerPlaceholder: {
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  // Modal Stilleri
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
  checkboxContainer: {
    marginTop: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {},
  checkboxLabel: {
    fontSize: 16,
  },
  uploadContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 16,
  },
  uploadText: {
    marginTop: 12,
    fontSize: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});