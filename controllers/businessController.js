const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const databaseService = require('../services/databaseService');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Get business details of a particular user
router.get('/business/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Call database service method
    const business = await databaseService.db.GetBusinessByUserId({ UserId: userId });

    if (business) {
      // Get TailorItemPrices details using businessId
      let tailorItemPrices = [];
      if (business.businessId) {
        try {
          tailorItemPrices = await databaseService.db.GetTailorItemPricesByBusinessId({ BusinessId: business.businessId });
          console.log('✅ Tailor item prices retrieved for business:', business.businessId);
        } catch (error) {
          console.error('❌ Error getting tailor item prices:', error);
          // Continue without failing the request
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Business details retrieved successfully',
        data: {
          ...business,
          tailorItemPrices: tailorItemPrices
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No business information found for this user'
      });
    }

  } catch (error) {
    console.error('❌ Error getting business details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get business details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all businesses (for admin/listing)
router.get('/businesses', authenticateToken, async (req, res) => {
  try {
    // Call database service method
    const businesses = await databaseService.db.GetAllBusinesses();

    return res.status(200).json({
      success: true,
      message: 'All businesses retrieved successfully',
      count: businesses.length,
      data: businesses
    });

  } catch (error) {
    console.error('❌ Error getting all businesses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get businesses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get list of all tailors with their business information
router.get('/tailors', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Get tailors list request received');
    
    // Call database service method
    const tailors = await databaseService.db.GetTailorsList();

    return res.status(200).json({
      success: true,
      message: 'Tailors list retrieved successfully',
      count: tailors.length,
      data: tailors
    });

  } catch (error) {
    console.error('❌ Error getting tailors list:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tailors list',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get tailor by businessId
router.get('/tailor/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    console.log('🔄 Get tailor by businessId request received:', businessId);

    // Call database service method
    const tailor = await databaseService.db.GetTailorByUserId({ BusinessId: businessId });

    if (tailor) {
      return res.status(200).json({
        success: true,
        message: 'Tailor details retrieved successfully',
        data: tailor
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No tailor found for this business ID'
      });
    }

  } catch (error) {
    console.error('❌ Error getting tailor by businessId:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tailor details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get tailor date availability by BusinessId
router.get('/tailor-date-availability/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    console.log('🔄 Get tailor date availability by businessId request received:', businessId);

    // Call database service method
    const availability = await databaseService.db.GetTailorDateAvailabilityByBusinessId({ BusinessId: businessId });

    return res.status(200).json({
      success: true,
      message: 'Tailor date availability retrieved successfully',
      count: availability.length,
      data: availability
    });

  } catch (error) {
    console.error('❌ Error getting tailor date availability:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tailor date availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all tailor date availability
router.get('/tailor-date-availability', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Get all tailor date availability request received');
    
    // Call database service method
    const availability = await databaseService.db.GetAllTailorDateAvailability();

    return res.status(200).json({
      success: true,
      message: 'All tailor date availability retrieved successfully',
      count: availability.length,
      data: availability
    });

  } catch (error) {
    console.error('❌ Error getting all tailor date availability:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tailor date availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create/Update tailor date availability
router.post('/tailor-date-availability', authenticateToken, async (req, res) => {
  try {
    const {
      businessId,
      date,
      isClosed
    } = req.body;

    // Validate required fields
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'BusinessId is required'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    if ( isClosed  === undefined || isClosed === null) {
      return res.status(400).json({
        success: false,
        message: 'IsClosed is required'
      });
    }

    console.log('🔄 Create/Update tailor date availability request received');
    console.log('📋 BusinessId:', businessId);
    console.log('📋 Date:', date);


    // Check if tailor date availability already exists for this BusinessId
    const existingAvailability = await databaseService.db.CheckTailorDateAvailabilityExists({ BusinessId: businessId, Date: date });

    if (existingAvailability) {
      // Update existing record
      console.log('🔄 Updating existing tailor date availability');
      await databaseService.db.UpdateTailorDateAvailability({
        TailorDateAvailabilityId: existingAvailability.TailorDateAvailabilityId,
        Date: date,
        IsClosed: isClosed
      });

      return res.status(200).json({
        success: true,
        message: 'Tailor date availability updated successfully'
      });
    } else {
      // Insert new record
      console.log('🔄 Creating new tailor date availability');
      const result = await databaseService.db.InsertTailorDateAvailability({
        BusinessId: businessId,
        Date: date,
        IsClosed: isClosed
      });

      return res.status(201).json({
        success: true,
        message: 'Tailor date availability created successfully',
        data: {
          tailorDateAvailabilityId: result.tailorDateAvailabilityId
        }
      });
    }

  } catch (error) {
    console.error('❌ Error saving tailor date availability:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save tailor date availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create/Update business information
router.post('/business', authenticateToken, async (req, res) => {
  try {
    const {
      userId,
      businessName,
      businessEmail,
      businessPhone,
      gstNumber,
      panNumber,
      address,
      city,
      state,
      country,
      zipCode,
      businessType
    } = req.body;

    // Check if business already exists
    const existingBusiness = await databaseService.db.CheckBusinessExists({ UserId: userId });

    if (existingBusiness) {
      // Update existing business
      await databaseService.db.UpdateBusinessInformation({
        UserId: userId,
        BusinessName: businessName,
        BusinessEmail: businessEmail,
        BusinessPhone: businessPhone,
        GSTNumber: gstNumber || '',
        PanNumber: panNumber || '',
        Address: address || '',
        City: city || '',
        State: state || '',
        Country: country || '',
        ZipCode: zipCode || '',
        BusinessType: businessType || ''
      });

      return res.status(200).json({
        success: true,
        message: 'Business information updated successfully'
      });

    } else {
      // Insert new business
      await databaseService.db.InsertBusinessInformation({
        userId: userId,
        businessName: businessName,
        email: businessEmail,
        mobileNumber: businessPhone
      });

      return res.status(201).json({
        success: true,
        message: 'Business information created successfully'
      });
    }

  } catch (error) {
    console.error('❌ Error saving business information:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save business information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update business information by business ID
router.put('/business/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const {
      ownerName,
      businessName,
      email,
      mobileNumber,
      alternateNumber,
      shopAddress,
      googleMapLink,
      gpsLatitude,
      gpsLongitude,
      workingCity,
      serviceTypes,
      specialization,
      yearsOfExperience,
      portfolioPhotos,
      certifications,
      openingTime,
      closingTime,
      weeklyOff,
      businessLogo,
      businessDescription,
      tailoringCategories
    } = req.body;

    console.log('📋 Update business request - businessId:', businessId);
    console.log('📋 businessLogo length:', businessLogo ? businessLogo.length : 0);
    console.log('📋 portfolioPhotos length:', portfolioPhotos ? portfolioPhotos.length : 0);

    // Build update object - only include fields that are provided
    // This matches the signup API behavior which accepts base64 data
    const updateData = { businessId: businessId };
    
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (email !== undefined) updateData.email = email;
    if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;
    if (alternateNumber !== undefined) updateData.alternateNumber = alternateNumber;
    if (shopAddress !== undefined) updateData.shopAddress = shopAddress;
    if (googleMapLink !== undefined) updateData.googleMapLink = googleMapLink;
    if (gpsLatitude !== undefined) updateData.gpsLatitude = gpsLatitude;
    if (gpsLongitude !== undefined) updateData.gpsLongitude = gpsLongitude;
    if (workingCity !== undefined) updateData.workingCity = workingCity;
    if (serviceTypes !== undefined) updateData.serviceTypes = serviceTypes;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience;
    if (portfolioPhotos !== undefined) updateData.portfolioPhotos = portfolioPhotos;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (openingTime !== undefined) updateData.openingTime = openingTime;
    if (closingTime !== undefined) updateData.closingTime = closingTime;
    if (weeklyOff !== undefined) updateData.weeklyOff = weeklyOff;
    if (businessLogo !== undefined) updateData.businessLogo = businessLogo;
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription;
    if (tailoringCategories !== undefined) updateData.tailoringCategories = tailoringCategories;

    // Update business by business ID with only provided fields
    const result = await databaseService.db.UpdateBusinessByBusinessId(updateData);

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      // Handle tailor item prices update/insert logic
      let tailoringCategoriesWithDetailsArray = req.body.tailoringCategoriesDetails;
      
      // If not found as array, check tailoringCategoriesDetails (might be a JSON string)
      if (!tailoringCategoriesWithDetailsArray && req.body.tailoringCategoriesDetails) {
        try {
          console.log('🔄 Found tailoringCategoriesDetails, attempting to parse JSON string');
          const parsedDetails = typeof req.body.tailoringCategoriesDetails === 'string' 
            ? JSON.parse(req.body.tailoringCategoriesDetails) 
            : req.body.tailoringCategoriesDetails;
          
          if (Array.isArray(parsedDetails)) {
            tailoringCategoriesWithDetailsArray = parsedDetails;
            console.log('✅ Successfully parsed tailoringCategoriesDetails');
          }
        } catch (parseError) {
          console.error('❌ Error parsing tailoringCategoriesDetails:', parseError);
          console.log('⚠️ Could not parse tailoringCategoriesDetails as JSON');
        }
      }
      
      if (tailoringCategoriesWithDetailsArray && Array.isArray(tailoringCategoriesWithDetailsArray) && tailoringCategoriesWithDetailsArray.length > 0) {
        try {
          console.log('🔄 Processing tailor item prices for business:', businessId);
          console.log('📋 Tailoring categories with details array:', tailoringCategoriesWithDetailsArray);
          
          // Get existing tailor item prices for this business
          const existingPrices = await databaseService.db.GetTailorItemPricesByBusinessId({ BusinessId: businessId });
          console.log('📋 Existing tailor item prices:', existingPrices);
          
          // Create a map of existing prices by ItemId for quick lookup
          const existingPricesMap = {};
          existingPrices.forEach(price => {
            if (price.ItemId !== null && price.ItemId !== undefined) {
              existingPricesMap[price.ItemId] = price;
            }
          });
          
          const currentTime = new Date().toISOString();
          const updateInsertPromises = tailoringCategoriesWithDetailsArray.map(async (item) => {
            const tailorItemPriceData = {
              BusinessId: businessId,
              ItemId: item.ItemId || null,
              FullPrice: item.FullPrice || null,
              DiscountPrice: item.DiscountPrice || null,
              DiscountType: item.DiscountType || null,
              DiscountValue: item.DiscountValue || null,
              EstimatedDays: item.EstimatedDays || null,
              IsAvailable: item.IsAvailable !== undefined ? item.IsAvailable : true,
              Notes: item.Notes || null,
              CreatedAt: currentTime,
              UpdatedAt: currentTime
            };
            
            // Check if this item already exists (by BusinessId and ItemId)
            const existingPrice = item.ItemId ? existingPricesMap[item.ItemId] : null;
            
            if (existingPrice) {
              // Update existing record
              console.log('🔄 Updating existing tailor item price for ItemId:', item.ItemId);
              return await databaseService.db.UpdateTailorItemPrice(tailorItemPriceData);
            } else {
              // Insert new record
              console.log('📋 Inserting new tailor item price for ItemId:', item.ItemId);
              return await databaseService.db.InsertTailorItemPrice(tailorItemPriceData);
            }
          });
          
          await Promise.all(updateInsertPromises);
          console.log('✅ All tailor item prices processed successfully');
        } catch (error) {
          console.error('❌ Error processing tailor item prices:', error);
          console.error('❌ Error details:', error.message);
          // Log error but don't fail the update
          console.log('⚠️ Business updated but failed to process tailor item prices');
        }
      } else {
        console.log('ℹ️ No tailoringCategoriesWithDetailsArray or tailoringCategoriesDetails provided or empty array');
      }
      
      return res.status(200).json({
        success: true,
        message: 'Business information updated successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

  } catch (error) {
    console.error('❌ Error updating business information:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update business information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload business logo
router.post('/business/:businessId/upload-logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload an image file.'
      });
    }

    // Create business directory if it doesn't exist
    const businessDir = path.join(__dirname, '..', 'uploads', 'business');
    if (!fs.existsSync(businessDir)) {
      fs.mkdirSync(businessDir, { recursive: true });
    }

    // Move file to business directory
    const oldPath = req.file.path;
    const newPath = path.join(businessDir, req.file.filename);
    fs.renameSync(oldPath, newPath);

    // Generate URL path for the uploaded file
    const logoUrl = `/uploads/business/${req.file.filename}`;

    // Update business with logo path only
    await databaseService.db.UpdateBusinessLogo({
      businessId: businessId,
      businessLogo: logoUrl
    });

    return res.status(200).json({
      success: true,
      message: 'Business logo uploaded successfully',
      data: {
        logoUrl: logoUrl,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('❌ Error uploading business logo:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload business logo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete business information
router.delete('/business/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Call database service method for soft delete
    const result = await databaseService.db.DeleteBusinessInformation({ UserId: userId });

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'Business information deleted successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Business information not found'
      });
    }

  } catch (error) {
    console.error('❌ Error deleting business information:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete business information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all tailor items
router.get('/tailor-items', async (req, res) => {
  try {
    console.log('🔄 Get all tailor items request received');
    
    // Call database service method
    const tailorItems = await databaseService.db.GetAllTailorItems();

    return res.status(200).json({
      success: true,
      message: 'Tailor items retrieved successfully',
      count: tailorItems.length,
      data: tailorItems
    });

  } catch (error) {
    console.error('❌ Error getting tailor items:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tailor items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
