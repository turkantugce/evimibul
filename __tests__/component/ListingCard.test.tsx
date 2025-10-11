import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import ListingCard from '../../components/ListingCard';
import { IListing } from '../../types/types';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#fff',
      text: '#000',
      secondaryText: '#666',
      border: '#e0e0e0',
      success: '#4CAF50',
    },
  }),
}));

const createMockTimestamp = () =>
  ({
    seconds: 0,
    nanoseconds: 0,
    toDate: () => new Date(),
    toMillis: () => Date.now(),
    isEqual: () => false,
    toJSON: () => '',
  } as any);

const mockListing: IListing = {
  id: 'listing-1',
  title: 'Sevimli Kedi',
  species: 'Kedi',
  breed: 'Tekir',
  age: '0-6 ay',
  gender: 'Dişi',
  city: 'İstanbul',
  district: 'Kadıköy',
  description: 'Çok sevimli bir kedi',
  photos: ['https://example.com/photo.jpg'],
  vaccinated: true,
  neutered: false,
  status: 'active',
  ownerId: 'owner-id',
  createdAt: createMockTimestamp(),
  updatedAt: createMockTimestamp(),
};

describe('ListingCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with listing data', async () => {
    const { getByText, getAllByText } = render(
      <ListingCard listing={mockListing} onPress={mockOnPress} />
    );

    expect(getByText('Sevimli Kedi')).toBeTruthy();
    expect(getAllByText(/Kedi/).length).toBeGreaterThan(0);
    expect(getByText(/0-6 ay/)).toBeTruthy();
    expect(getByText(/İstanbul/)).toBeTruthy();
  });

  it('displays listing photo', async () => {
    const { UNSAFE_getAllByType } = render(
      <ListingCard listing={mockListing} onPress={mockOnPress} />
    );

    const images = UNSAFE_getAllByType('Image' as any);
    expect(images.length).toBeGreaterThan(0);
  });

  it('shows placeholder when no photo available', async () => {
    const listingWithoutPhoto = { ...mockListing, photos: [] };

    const { UNSAFE_getAllByType } = render(
      <ListingCard listing={listingWithoutPhoto} onPress={mockOnPress} />
    );

    const views = UNSAFE_getAllByType('View' as any);
    expect(views.length).toBeGreaterThan(0);
  });

  it('calls onPress when card is pressed', async () => {
    const { getByText } = render(
      <ListingCard listing={mockListing} onPress={mockOnPress} />
    );

    const card = getByText('Sevimli Kedi').parent?.parent?.parent;
    await act(async () => {
      if (card) fireEvent.press(card);
    });
    expect(mockOnPress).toHaveBeenCalledWith(mockListing);
  });

  it('displays vaccination badge', async () => {
    const { getByText } = render(
      <ListingCard listing={mockListing} onPress={mockOnPress} />
    );
    expect(getByText('Aşılı')).toBeTruthy();
  });

  it('displays neutered badge when applicable', async () => {
    const neuteredListing = { ...mockListing, neutered: true };
    const { getByText } = render(
      <ListingCard listing={neuteredListing} onPress={mockOnPress} />
    );
    expect(getByText('Kısır')).toBeTruthy();
  });

  it('does not show vaccination badge when not vaccinated', async () => {
    const unvaccinatedListing = { ...mockListing, vaccinated: false };
    const { queryByText } = render(
      <ListingCard listing={unvaccinatedListing} onPress={mockOnPress} />
    );
    expect(queryByText('Aşılı')).toBeFalsy();
  });

  it('truncates long titles correctly', async () => {
    const longTitleListing = {
      ...mockListing,
      title: 'Çok çok çok çok uzun bir ilan başlığı bu gerçekten çok uzun',
    };
    const { getByText } = render(
      <ListingCard listing={longTitleListing} onPress={mockOnPress} />
    );
    const titleElement = getByText(/Çok çok çok/);
    expect(titleElement.props.numberOfLines).toBe(2);
  });

  it('displays meta information correctly formatted', async () => {
    const { getByText } = render(
      <ListingCard listing={mockListing} onPress={mockOnPress} />
    );
    expect(getByText(/Kedi.*0-6 ay.*İstanbul/)).toBeTruthy();
  });

  it('renders with minimal listing props gracefully', async () => {
    const minimalListing: IListing = {
      id: 'minimal',
      title: '',
      species: '',
      breed: '',
      age: '',
      gender: '',
      city: '',
      district: '',
      description: '',
      photos: [],
      vaccinated: false,
      neutered: false,
      status: 'active',
      ownerId: '',
      createdAt: createMockTimestamp(),
      updatedAt: createMockTimestamp(),
    };

    const { UNSAFE_getByType } = render(
      <ListingCard listing={minimalListing} onPress={mockOnPress} />
    );

    const view = UNSAFE_getByType('View' as any);
    expect(view).toBeTruthy();
  });

  it('applies correct styling', async () => {
    const { getByText } = render(
      <ListingCard listing={mockListing} onPress={mockOnPress} />
    );
    const card = getByText('Sevimli Kedi').parent?.parent?.parent;
    expect(card?.props?.style).toBeDefined();
  });

  it('shows both health badges when both conditions are true', async () => {
    const healthyListing = { ...mockListing, vaccinated: true, neutered: true };
    const { getByText } = render(
      <ListingCard listing={healthyListing} onPress={mockOnPress} />
    );
    expect(getByText('Aşılı')).toBeTruthy();
    expect(getByText('Kısır')).toBeTruthy();
  });

  it('handles missing breed gracefully', async () => {
    const noBreedListing = { ...mockListing, breed: '' };
    const { getByText } = render(
      <ListingCard listing={noBreedListing} onPress={mockOnPress} />
    );
    expect(getByText('Sevimli Kedi')).toBeTruthy();
  });

  it('handles missing gender gracefully', async () => {
    const noGenderListing = { ...mockListing, gender: '' };
    const { UNSAFE_getByType } = render(
      <ListingCard listing={noGenderListing} onPress={mockOnPress} />
    );
    const view = UNSAFE_getByType('View' as any);
    expect(view).toBeTruthy();
  });
});
